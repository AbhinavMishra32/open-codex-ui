import { Injectable, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { agent, AgentEngine, AgentEventType, type AgentEvent } from "@repo/agent-core";
import { ApiTransport } from "./api.transport.js";
import type {
  AgentSession,
  AgentStep,
  AgentTurn,
  ApiLogEntry,
  StepRuntimeEvent,
  StreamEnvelope,
} from "./types.js";

interface SessionRuntime {
  session: AgentSession;
  queue: Promise<void>;
  listeners: Set<(envelope: StreamEnvelope) => void>;
  seq: number;
  backlog: StreamEnvelope[];
  logs: ApiLogEntry[];
  inputHandler?: (input: string) => Promise<void>;
}

@Injectable()
export class AgentApiService {
  private readonly logger = new Logger(AgentApiService.name);
  private readonly sessions = new Map<string, SessionRuntime>();

  private getRuntime(sessionId: string): SessionRuntime {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;

    const now = Date.now();
    const created: SessionRuntime = {
      session: { id: sessionId, turns: [], createdAt: now, updatedAt: now },
      queue: Promise.resolve(),
      listeners: new Set(),
      seq: 0,
      backlog: [],
      logs: [],
    };
    this.sessions.set(sessionId, created);
    return created;
  }

  getSession(sessionId: string): AgentSession {
    return this.getRuntime(sessionId).session;
  }

  getEvents(sessionId: string, limit = 200): StreamEnvelope[] {
    const rt = this.getRuntime(sessionId);
    const safe = Math.max(1, Math.min(limit, 1000));
    return rt.backlog.slice(-safe);
  }

  getLogs(sessionId: string, limit = 200): ApiLogEntry[] {
    const rt = this.getRuntime(sessionId);
    const safe = Math.max(1, Math.min(limit, 1000));
    return rt.logs.slice(-safe);
  }

  stream(sessionId: string): Observable<{ data: StreamEnvelope }> {
    const rt = this.getRuntime(sessionId);

    return new Observable((subscriber) => {
      const listener = (envelope: StreamEnvelope) => subscriber.next({ data: envelope });
      rt.listeners.add(listener);
      this.writeLog(rt, "info", "sse.connected", { sessionId, listeners: rt.listeners.size });

      return () => {
        rt.listeners.delete(listener);
        this.writeLog(rt, "info", "sse.disconnected", { sessionId, listeners: rt.listeners.size });
      };
    });
  }

  submitTurn(sessionId: string, input: string) {
    const rt = this.getRuntime(sessionId);
    const turnId = crypto.randomUUID();
    const requestId = crypto.randomUUID();

    rt.queue = rt.queue
      .then(() => this.runTurn(rt, sessionId, turnId, requestId, input))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.writeLog(rt, "error", "turn.queue.error", { sessionId, turnId, requestId, error: message });
      });

    this.writeLog(rt, "info", "turn.queued", { sessionId, turnId, requestId, inputLength: input.length });
    return { queued: true, sessionId, turnId, requestId };
  }

  async submitHumanInput(sessionId: string, input: string) {
    const rt = this.getRuntime(sessionId);

    if (!rt.inputHandler) return { accepted: false, delivered: false };

    const handler = rt.inputHandler;
    rt.inputHandler = undefined;
    await handler(input);

    this.publish(rt, {
      type: "status",
      sessionId,
      turnId: this.currentTurn(rt)?.id ?? "unknown",
      requestId: this.currentTurn(rt)?.requestId ?? "unknown",
      status: "human_input.received",
      timestamp: Date.now(),
    });

    return { accepted: true, delivered: true };
  }

  private async runTurn(rt: SessionRuntime, sessionId: string, turnId: string, requestId: string, input: string) {
    const now = Date.now();
    const stepId = `${turnId}:step:1`;

    const turn: AgentTurn = {
      id: turnId,
      requestId,
      input,
      finalText: "",
      status: "running",
      steps: [
        {
          id: stepId,
          title: "Reason -> Tools -> Answer",
          status: "running",
          reasoning: "",
          assistantText: "",
          tools: [],
        },
      ],
      createdAt: now,
    };

    rt.session.turns.push(turn);
    rt.session.updatedAt = now;

    this.publish(rt, { type: "turn.started", sessionId, turnId, requestId, input, timestamp: now });
    this.publish(rt, {
      type: "step.started",
      sessionId,
      turnId,
      requestId,
      stepId,
      title: turn.steps[0].title,
      timestamp: Date.now(),
    });
    this.writeLog(rt, "info", "turn.started", { sessionId, turnId, requestId });

    if (!process.env.OPENAI_API_KEY) {
      const message = "OPENAI_API_KEY is not set in API process environment.";
      turn.status = "error";
      turn.error = message;
      turn.completedAt = Date.now();
      turn.steps[0].status = "error";
      rt.session.updatedAt = Date.now();

      this.publish(rt, { type: "turn.failed", sessionId, turnId, requestId, error: message, timestamp: Date.now() });
      this.writeLog(rt, "error", "turn.failed", { sessionId, turnId, requestId, error: message });
      return;
    }

    const transport = new ApiTransport(
      async (event) => this.applyCoreEvent(rt, event, sessionId, turnId, requestId, stepId),
      (callback) => {
        rt.inputHandler = callback;
        this.publish(rt, {
          type: "status",
          sessionId,
          turnId,
          requestId,
          status: "human_input.requested",
          timestamp: Date.now(),
        });
      }
    );

    const engine = new AgentEngine(agent, transport);
    const history = this.toHistory(rt.session);
    history.push({ role: "user" as const, text: input });

    try {
      const timeoutMs = Number(process.env.AGENT_TURN_TIMEOUT_MS ?? 120000);
      const { finalText } = await this.withTimeout(
        engine.run(history),
        timeoutMs,
        `Agent run timed out after ${timeoutMs}ms`
      );
      const current = this.findTurn(rt, turnId);
      if (!current.finalText && finalText) current.finalText = finalText;
      current.status = "completed";
      current.completedAt = Date.now();
      current.steps[0].status = "completed";
      rt.session.updatedAt = Date.now();

      this.publish(rt, {
        type: "turn.completed",
        sessionId,
        turnId,
        requestId,
        finalText: current.finalText,
        timestamp: Date.now(),
      });

      this.writeLog(rt, "info", "turn.completed", { sessionId, turnId, requestId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const current = this.findTurn(rt, turnId);
      current.status = "error";
      current.error = message;
      current.completedAt = Date.now();
      current.steps[0].status = "error";
      rt.session.updatedAt = Date.now();

      this.publish(rt, { type: "turn.failed", sessionId, turnId, requestId, error: message, timestamp: Date.now() });
      this.writeLog(rt, "error", "turn.failed", { sessionId, turnId, requestId, error: message });
    }
  }

  private async applyCoreEvent(
    rt: SessionRuntime,
    event: AgentEvent,
    sessionId: string,
    turnId: string,
    requestId: string,
    stepId: string
  ) {
    const turn = this.findTurn(rt, turnId);
    const step = this.findStep(turn, stepId);

    if (event.type === AgentEventType.THINKING) {
      const text = String(event.payload ?? "");
      step.reasoning += text;
      this.publish(rt, { type: "reasoning.delta", sessionId, turnId, requestId, stepId, text, timestamp: Date.now() });
      return;
    }

    if (event.type === AgentEventType.MESSAGE) {
      const text = String(event.payload ?? "");
      step.assistantText += text;
      turn.finalText += text;
      this.publish(rt, { type: "assistant.delta", sessionId, turnId, requestId, stepId, text, timestamp: Date.now() });
      return;
    }

    if (event.type === AgentEventType.TOOL_CALL) {
      const payload = event.payload as any;
      const toolCallId = typeof payload?.id === "string" ? payload.id : crypto.randomUUID();
      const toolName = typeof payload?.name === "string" ? payload.name : "tool";

      step.tools.push({ toolCallId, name: toolName, status: "running", input: payload?.args ?? payload });
      this.publish(rt, {
        type: "tool.started",
        sessionId,
        turnId,
        requestId,
        stepId,
        toolCallId,
        toolName,
        input: payload,
        timestamp: Date.now(),
      });
      return;
    }

    if (event.type === AgentEventType.TOOL_RESULT) {
      const payload = event.payload as any;
      const toolCallId =
        typeof payload?.toolCallId === "string"
          ? payload.toolCallId
          : step.tools.find((t) => t.status === "running")?.toolCallId ?? crypto.randomUUID();

      const tool = step.tools.find((t) => t.toolCallId === toolCallId);
      const toolName = tool?.name ?? (typeof payload?.toolName === "string" ? payload.toolName : "tool");
      const ok = payload?.ok !== false;

      if (tool) {
        tool.status = ok ? "completed" : "error";
        tool.output = payload?.output ?? payload;
        tool.error = payload?.error;
      }

      this.publish(rt, {
        type: "tool.completed",
        sessionId,
        turnId,
        requestId,
        stepId,
        toolCallId,
        toolName,
        ok,
        output: payload?.output ?? payload,
        error: payload?.error,
        timestamp: Date.now(),
      });
      return;
    }

    if (event.type === AgentEventType.ERROR) {
      const message = String(event.payload ?? "unknown error");
      turn.status = "error";
      turn.error = message;
      step.status = "error";
      this.writeLog(rt, "error", "core.error", { sessionId, turnId, requestId, error: message });
    }
  }

  private findTurn(rt: SessionRuntime, turnId: string): AgentTurn {
    const turn = rt.session.turns.find((t) => t.id === turnId);
    if (!turn) throw new Error(`Turn not found: ${turnId}`);
    return turn;
  }

  private findStep(turn: AgentTurn, stepId: string): AgentStep {
    const step = turn.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);
    return step;
  }

  private currentTurn(rt: SessionRuntime): AgentTurn | undefined {
    return rt.session.turns[rt.session.turns.length - 1];
  }

  private toHistory(session: AgentSession): Array<{ role: "user" | "assistant"; text: string }> {
    const out: Array<{ role: "user" | "assistant"; text: string }> = [];
    for (const turn of session.turns) {
      out.push({ role: "user", text: turn.input });
      if (turn.finalText.trim()) out.push({ role: "assistant", text: turn.finalText });
    }
    return out;
  }

  private publish(rt: SessionRuntime, event: StepRuntimeEvent) {
    rt.session.updatedAt = Date.now();

    const envelope: StreamEnvelope = {
      id: crypto.randomUUID(),
      sessionId: event.sessionId,
      seq: ++rt.seq,
      timestamp: Date.now(),
      event,
    };

    rt.backlog.push(envelope);
    if (rt.backlog.length > 1000) rt.backlog.splice(0, rt.backlog.length - 1000);

    for (const listener of rt.listeners) listener(envelope);
  }

  private writeLog(rt: SessionRuntime, level: "info" | "error", message: string, metadata: Record<string, unknown>) {
    const entry: ApiLogEntry = {
      id: crypto.randomUUID(),
      level,
      message,
      at: Date.now(),
      sessionId: String(metadata.sessionId ?? "unknown"),
      turnId: typeof metadata.turnId === "string" ? metadata.turnId : undefined,
      requestId: typeof metadata.requestId === "string" ? metadata.requestId : undefined,
      metadata,
    };

    rt.logs.push(entry);
    if (rt.logs.length > 1000) rt.logs.splice(0, rt.logs.length - 1000);

    const line = JSON.stringify({ level, message, at: new Date(entry.at).toISOString(), ...metadata });
    if (level === "error") this.logger.error(line);
    else this.logger.log(line);
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }
}

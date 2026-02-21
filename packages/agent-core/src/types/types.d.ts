export interface AgentTool {
  toolCallId: string;
  name: string;
  status: "running" | "completed" | "error";
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface AgentStep {
  id: string;
  title: string;
  status: "running" | "completed" | "error";
  reasoning: string;
  assistantText: string;
  tools: AgentTool[];
}

export interface AgentTurn {
  id: string;
  requestId: string;
  input: string;
  finalText: string;
  status: "running" | "completed" | "error";
  steps: AgentStep[];
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface AgentSession {
  id: string;
  turns: AgentTurn[];
  createdAt: number;
  updatedAt: number;
}

export type StepRuntimeEvent =
  | { type: "turn.started"; sessionId: string; turnId: string; requestId: string; input: string; timestamp: number }
  | { type: "step.started"; sessionId: string; turnId: string; requestId: string; stepId: string; title: string; timestamp: number }
  | { type: "reasoning.delta"; sessionId: string; turnId: string; requestId: string; stepId: string; text: string; timestamp: number }
  | { type: "assistant.delta"; sessionId: string; turnId: string; requestId: string; stepId: string; text: string; timestamp: number }
  | { type: "tool.started"; sessionId: string; turnId: string; requestId: string; stepId: string; toolCallId: string; toolName: string; input?: unknown; timestamp: number }
  | { type: "tool.completed"; sessionId: string; turnId: string; requestId: string; stepId: string; toolCallId: string; toolName: string; ok: boolean; output?: unknown; error?: string; timestamp: number }
  | { type: "status"; sessionId: string; turnId: string; requestId: string; status: "human_input.requested" | "human_input.received"; timestamp: number }
  | { type: "turn.completed"; sessionId: string; turnId: string; requestId: string; finalText: string; timestamp: number }
  | { type: "turn.failed"; sessionId: string; turnId: string; requestId: string; error: string; timestamp: number };

export interface StreamEnvelope {
  id: string;
  sessionId: string;
  seq: number;
  timestamp: number;
  event: StepRuntimeEvent;
}

export interface ApiLogEntry {
  id: string;
  level: "info" | "error";
  message: string;
  at: number;
  sessionId: string;
  turnId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}


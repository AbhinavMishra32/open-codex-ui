import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, Sse } from "@nestjs/common";
import type { ReasoningConfig } from "@repo/agent-core";
import { AgentApiService } from "./agent-api.service.js";

@Controller("agent")
export class AgentApiController {
  constructor(@Inject(AgentApiService) private readonly service: AgentApiService) {}

  @Get("sessions/:sessionId")
  getSession(@Param("sessionId") sessionId: string) {
    return this.service.getSession(sessionId);
  }

  @Get("models")
  getModels() {
    return this.service.getModels();
  }

  @Get("sessions/:sessionId/events")
  getEvents(@Param("sessionId") sessionId: string, @Query("limit") limit = "200") {
    return this.service.getEvents(sessionId, Number(limit));
  }

  @Get("sessions/:sessionId/logs")
  getLogs(@Param("sessionId") sessionId: string, @Query("limit") limit = "200") {
    return this.service.getLogs(sessionId, Number(limit));
  }

  @Post("sessions/:sessionId/turns")
  submitTurn(
    @Param("sessionId") sessionId: string,
    @Body() body: { input?: unknown; modelId?: unknown; reasoning?: unknown }
  ) {
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input) throw new BadRequestException("input must be non-empty string");
    const modelId = typeof body?.modelId === "string" ? body.modelId : undefined;
    const reasoning = this.parseReasoning(body?.reasoning);
    return this.service.submitTurn(sessionId, input, modelId, reasoning);
  }

  @Post("sessions/:sessionId/input")
  submitHumanInput(@Param("sessionId") sessionId: string, @Body() body: { input?: unknown }) {
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input) throw new BadRequestException("input must be non-empty string");
    return this.service.submitHumanInput(sessionId, input);
  }

  @Sse("sessions/:sessionId/stream")
  stream(@Param("sessionId") sessionId: string) {
    return this.service.stream(sessionId);
  }

  private parseReasoning(raw: unknown): Partial<ReasoningConfig> | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const effort = typeof (raw as { effort?: unknown }).effort === "string"
      ? (raw as { effort: ReasoningConfig["effort"] }).effort
      : undefined;
    const summary = typeof (raw as { summary?: unknown }).summary === "string"
      ? (raw as { summary: ReasoningConfig["summary"] }).summary
      : undefined;

    if (!effort && !summary) return undefined;
    return { effort, summary };
  }
}

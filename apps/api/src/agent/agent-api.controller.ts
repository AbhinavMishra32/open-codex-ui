import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, Sse } from "@nestjs/common";
import { AgentApiService } from "./agent-api.service.js";

@Controller("agent")
export class AgentApiController {
  constructor(@Inject(AgentApiService) private readonly service: AgentApiService) {}

  @Get("sessions/:sessionId")
  getSession(@Param("sessionId") sessionId: string) {
    return this.service.getSession(sessionId);
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
  submitTurn(@Param("sessionId") sessionId: string, @Body() body: { input?: unknown }) {
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input) throw new BadRequestException("input must be non-empty string");
    return this.service.submitTurn(sessionId, input);
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
}

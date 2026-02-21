import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AgentApiController } from "./agent/agent-api.controller.js";
import { AgentApiService } from "./agent/agent-api.service.js";

@Module({
  controllers: [AppController, AgentApiController],
  providers: [AppService, AgentApiService],
})
export class AppModule { }


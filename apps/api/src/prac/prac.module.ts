import { Module } from "@nestjs/common";
import { PracController } from "./prac.controller.js";

@Module({
  controllers: [PracController],
})
export class PracModule {}

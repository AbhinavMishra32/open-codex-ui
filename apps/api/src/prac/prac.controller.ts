import { Controller, Get } from "@nestjs/common";

@Controller("prac")
export class PracController {
  @Get()
  health() {
    return { status: "ok", module: "prac" };
  }
}

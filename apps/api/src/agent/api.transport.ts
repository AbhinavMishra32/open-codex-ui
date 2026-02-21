import { AgentEventType, BaseTransport, type AgentEvent } from "@repo/agent-core";

type CoreEventType = (typeof AgentEventType)[keyof typeof AgentEventType];

export class ApiTransport extends BaseTransport {
  constructor(
    private readonly emitCoreEvent: <T extends CoreEventType>(event: AgentEvent<T>) => Promise<void>,
    private readonly registerInputHandler: (callback: (input: string) => Promise<void>) => void
  ) {
    super();
  }

  async emit<T extends CoreEventType>(event: AgentEvent<T>): Promise<void> {
    await this.emitCoreEvent(event);
  }

  onInput(callback: (input: string) => Promise<void>): void {
    this.registerInputHandler(callback);
  }
}

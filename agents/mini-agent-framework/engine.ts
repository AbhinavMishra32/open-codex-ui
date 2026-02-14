import { CompiledStateGraph } from "@langchain/langgraph";
import { BaseTransport, AgentEvent } from "./transport.js";
import { HumanMessage } from "langchain";

export class AgentEngine {
  constructor(
    private graph: CompiledStateGraph<any, any, any>,
    private transport: BaseTransport
  ) { };

  private async dispatch(type: AgentEvent['type'], payload: any) {
    await this.transport.emit({
      type,
      payload,
      timestamp: Date.now(),
    });
  }

  async run(initialInput: string) {
    const stream = await this.graph.stream({
      messages: [new HumanMessage(initialInput)]
    }, { streamMode: "messages" });

    for await (const [message, metadata] of stream) {
      // call this.dispatch
    }
  }
}

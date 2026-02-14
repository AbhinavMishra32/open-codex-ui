import { CompiledStateGraph } from "@langchain/langgraph";
import { BaseTransport, type AgentEvent, AgentEventType } from "./transport.js";
import { AIMessageChunk, HumanMessage } from "@langchain/core/messages";

export class AgentEngine {
  constructor(
    private graph: CompiledStateGraph<any, any, any>,
    private transport: BaseTransport
  ) { };

  private async dispatch(type: AgentEventType, payload: any) {
    await this.transport.emit({
      type,
      payload,
      timestamp: Date.now(),
    });
  }

  async run(initialInput: string) {
    const stream = await this.graph.stream({
      messages: [new HumanMessage(initialInput)]
    }, { 
      streamMode: "messages",
      configurable: { transport: this.transport }
    });

    for await (const [message, _metadata] of stream as any) {
      if (message instanceof AIMessageChunk) {
        this.handleChunk(message);
      }
    }
  }

  private handleChunk(chunk: AIMessageChunk) {
    if (Array.isArray(chunk.content)) {
      chunk.content.forEach((block) => {
        if (typeof block === 'object' && block !== null && 'type' in block) {
          if (block.type === 'reasoning' && 'reasoning' in block) {
            this.dispatch(AgentEventType.THINKING, block.reasoning);
          }
          else if (block.type === 'text' && 'text' in block) {
            this.dispatch(AgentEventType.MESSAGE, block.text);
          }
        } else if (typeof block === 'string') {
          this.dispatch(AgentEventType.MESSAGE, block);
        }
      });
    } else if (typeof chunk.content === 'string' && chunk.content) {
      this.dispatch(AgentEventType.MESSAGE, chunk.content);
    }

    if (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) {
      chunk.tool_call_chunks.forEach((toolCall) => {
        this.dispatch(AgentEventType.TOOL_CALL, toolCall);
      });
    }
  }
}

import { CompiledStateGraph } from "@langchain/langgraph";
import { BaseTransport, AgentEventType } from "./transport.js";
import { AIMessage, AIMessageChunk, HumanMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";

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

  async run(
    history: Array<{ role: "user" | "assistant"; text: string }>
  ): Promise<{ finalText: string }> {
    const toMessages = (items: Array<{ role: "user" | "assistant"; text: string }>): BaseMessage[] =>
      items.map((m) => (m.role === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)));

    const extractText = (content: AIMessageChunk["content"]): string => {
      if (typeof content === "string") return content;
      if (!Array.isArray(content)) return "";

      let out = "";
      for (const block of content) {
        if (typeof block === "string") {
          out += block;
          continue;
        }
        if (
          block &&
          typeof block === "object" &&
          "type" in block &&
          block.type === "text" &&
          "text" in block &&
          typeof (block as any).text === "string"
        ) {
          out += (block as any).text;
        }
      }
      return out;
    };

    try {
      const stream = await this.graph.stream(
        { messages: toMessages(history) },
        {
          streamMode: "messages",
          configurable: { transport: this.transport },
        }
      );

      let currentAIMessage: AIMessageChunk | null = null;
      let finalText = "";

      for await (const [message] of stream as any) {
        if (message instanceof AIMessageChunk) {
          currentAIMessage = currentAIMessage
            ? currentAIMessage.concat(message)
            : message;

          this.handleChunk(message);
          finalText += extractText(message.content);
        } else if (message instanceof ToolMessage) {
          // no-op: tool updates are emitted from chunk/tool layers
        }
      }

      if (!finalText && currentAIMessage) {
        finalText = extractText(currentAIMessage.content);
      }

      return { finalText };
    } catch (err: any) {
      await this.dispatch(AgentEventType.ERROR, err?.message ?? String(err));
      throw err;
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

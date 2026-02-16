import { describe, expect, it } from "vitest";
import { AIMessageChunk } from "@langchain/core/messages";
import { AgentEngine } from "../src/core/engine.js";
import { AgentEventType, BaseTransport, type AgentEvent } from "../src/core/transport.js";

class MockTransport extends BaseTransport {
  events: AgentEvent[] = [];

  async emit<T extends AgentEventType>(event: AgentEvent<T>) {
    this.events.push(event);
  }

  onInput(): void {
    // noop
  }
}

function streamFromMessages(messages: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const message of messages) {
        yield [message] as const;
      }
    },
  };
}

describe("AgentEngine", () => {
  it("returns final text and emits message events while streaming", async () => {
    const transport = new MockTransport();
    const graph = {
      stream: async () =>
        streamFromMessages([
          new AIMessageChunk({ content: [{ type: "text", text: "Hello" }] } as any),
          new AIMessageChunk({ content: " world" }),
        ]),
    };

    const engine = new AgentEngine(graph as any, transport);
    const result = await engine.run([{ role: "user", text: "hi" }]);

    const messagePayloads = transport.events
      .filter((event) => event.type === AgentEventType.MESSAGE)
      .map((event) => event.payload);

    expect(result.finalText).toBe("Hello world");
    expect(messagePayloads).toEqual(["Hello", " world"]);
  });

  it("emits reasoning and tool-call events", async () => {
    const transport = new MockTransport();
    const graph = {
      stream: async () =>
        streamFromMessages([
          new AIMessageChunk({
            content: [{ type: "reasoning", reasoning: "Thinking through plan" }],
            tool_call_chunks: [{ id: "call_1", name: "web_search", index: 0, args: "{}" }],
          } as any),
        ]),
    };

    const engine = new AgentEngine(graph as any, transport);
    await engine.run([{ role: "user", text: "hi" }]);

    expect(transport.events.some((event) => event.type === AgentEventType.THINKING)).toBe(true);
    expect(transport.events.some((event) => event.type === AgentEventType.TOOL_CALL)).toBe(true);
  });

  it("emits an error event when graph execution fails", async () => {
    const transport = new MockTransport();
    const graph = {
      stream: async () => {
        throw new Error("graph exploded");
      },
    };

    const engine = new AgentEngine(graph as any, transport);

    await expect(engine.run([{ role: "user", text: "hi" }])).rejects.toThrow("graph exploded");

    const errorEvent = transport.events.find((event) => event.type === AgentEventType.ERROR);
    expect(errorEvent).toBeDefined();
    expect(String(errorEvent?.payload)).toContain("graph exploded");
  });
});

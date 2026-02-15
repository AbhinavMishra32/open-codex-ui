
import { StateGraph, MessagesAnnotation, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import z from "zod";
import { tavily } from "@tavily/core";
import { HumanMessage, AIMessage, ToolMessage, SystemMessage, AIMessageChunk } from "@langchain/core/messages";
import { bus } from "../src/core/event-bus.js";

bus.on('agent:message', (data) => {
  process.stdout.write(`\n ${data.text}`);
});

bus.on('agent:thinking', (data) => {
  process.stdout.write(`\x1b[2m${data.text}\x1b[0m`); // Dimmed text for thinking
});

bus.on('human:input', (data) => {
  console.log(`\n\n[HUMAN]: ${data.text}\n`);
});

bus.on('agent:question', (data) => {
  process.stdout.write(`\n\n\x1b[33m[QUESTION]: ${data.text}\x1b[0m\n`);
})

bus.on('tool:call', (data) => {
  console.log(`\n[TOOL-CALL]: ${data.name}(${JSON.stringify(data.args)})`);
});

bus.on('tool:result', (data) => {
  console.log(`[TOOL-RESULT]: ${data.name} returned content\n`);
});



const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY!,
});

export const tavilyTool = tool(
  async ({ query }) => {
    const results = await tavilyClient.search(query);
    return JSON.stringify(results.results);
  },
  {
    name: "tavily_search",
    description: "Search the web for up-to-date information.",
    schema: z.object({
      query: z.string(),
    }),
  }
);


export const askHuman = tool(
  async ({ question }) => {
    await bus.emit('agent:question', { text: question });
    return new Promise((resolve) => {
      process.stdout.write("\nUser response: ");
      process.stdin.resume();
      process.stdin.once("data", async (data) => {
        const response = data.toString().trim();
        await bus.emit('human:input', { text: response });
        process.stdin.pause();
        resolve(response);
      });
    });
  },
  {
    name: "ask_human",
    description: "Ask human a question for clarification of tasks.",
    schema: z.object({
      question: z.string(),
    })
  }
)

const model = new ChatOpenAI({
  model: "gpt-5-nano",
  reasoning: {
    effort: "medium",
    summary: "auto"
  }
}).bindTools([tavilyTool, askHuman]);

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", async (state) => {
    const stream = await model.stream(state.messages);
    let fullMessage: AIMessageChunk | null = null;

    for await (const chunk of stream) {
      // 1. Capture the full message for LangGraph state                     
      fullMessage = !fullMessage ? chunk : fullMessage.concat(chunk);

      // 2. Check for reasoning or text blocks in the chunk                  
      if (Array.isArray(chunk.content)) {
        for (const block of chunk.content) {
          if (typeof block === "object" && block !== null) {
            if ("type" in block && block.type === "reasoning" && "reasoning" in block && typeof block.reasoning === "string") {
              await bus.emit('agent:thinking', { text: block.reasoning });
            } else if ("type" in block && block.type === "text" && "text" in block && typeof block.text === "string") {
              await bus.emit('agent:message', { text: block.text });
            }
          }
        }
      }
    }
    return { messages: [fullMessage] };
  })
  .addNode("tools", async (state) => {
    const last = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = last.tool_calls || [];
    const messages: ToolMessage[] = [];

    const toolsByName: Record<string, any> = {
      tavily_search: tavilyTool,
      ask_human: askHuman,
    };

    for (const toolCall of toolCalls) {
      const tool = toolsByName[toolCall.name];
      if (tool) {
        await bus.emit('tool:call', { name: toolCall.name, args: toolCall.args });
        const result = await tool.invoke(toolCall);
        await bus.emit('tool:result', { name: toolCall.name, result: result.content });
        messages.push(result);
      }
    }

    return { messages };
  })
  .addEdge("tools", "agent")
  .addConditionalEdges(
    "agent",
    (state) => {
      const last = state.messages[state.messages.length - 1] as AIMessage;
      return last.tool_calls?.length ? "tools" : END;
    }
  )
  .setEntryPoint("agent");

export const app = graph.compile();

async function run() {
  if (!process.env.TAVILY_API_KEY) {
    console.error("Please set TAVILY_API_KEY in your environment.");
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("Please set OPENAI_API_KEY in your environment.");
    return;
  }

  const initialMessage = "Latest news from (ask human)";
  await bus.emit('human:input', { text: initialMessage });

  const result = await app.invoke({
    messages: [
      new SystemMessage("Whenever you feel like the given info is lesser than required to resolve this problem then please use the tool ask_human to get clarification from human, then proceed, if still not clear or human said something that didnt make sense then ask again"),
      new HumanMessage(initialMessage),
    ],
  });

  console.log("\n\nFinal response:\n");
  const lastMessage = result.messages[result.messages.length - 1];
  if (Array.isArray(lastMessage.content)) {
    console.log(lastMessage.content.map(c => 'text' in c ? c.text : '').join(''));
  } else {
    console.log(lastMessage.content);
  }
}

if (process.argv[1]?.endsWith("human-in-the-loop-agent.ts")) {
  run().catch(console.error);
}

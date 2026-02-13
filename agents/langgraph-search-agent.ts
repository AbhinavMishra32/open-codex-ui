import { StateGraph, MessagesAnnotation, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import z from "zod";
import { tavily } from "@tavily/core";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";


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

const model = new ChatOpenAI({
  model: "gpt-5-nano",
}).bindTools([tavilyTool]);

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", async (state) => {
    const response = await model.invoke(state.messages)
    return { messages: [response] };
  })
  .addNode("tools", async (state) => {
    const last = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = last.tool_calls || [];
    if (toolCalls.length > 0) {
      // console.log("Tool call object: ", JSON.stringify(last));
    }
    const messages: ToolMessage[] = [];

    for (const toolCall of toolCalls) {
      const result = await tavilyTool.invoke(toolCall);
      console.log("TAVILY TOOL CALL: ", result);
      messages.push(result);
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

  const result = await app.invoke({
    messages: [
      new HumanMessage("Find out what happened in ghaziabad past week"),
    ],
  });

  console.log("\nFinal response:\n");
  const lastMessage = result.messages[result.messages.length - 1];
  console.log(lastMessage.content);
}

if (process.argv[1]?.endsWith("langgraph-search-agent.ts")) {
  run().catch(console.error);
}

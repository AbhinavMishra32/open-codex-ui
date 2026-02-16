import { tavily } from "@tavily/core";
import { tool } from "langchain";
import { z } from "zod";
import { AgentEventType, BaseTransport } from "../core/transport.js";

const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY!,
});

export const webSearch = tool(
  async ({ query }, config) => {
    const results = await tavilyClient.search(query);
    const transport = config.configurable?.transport as BaseTransport;

    if (transport) {
      await transport.emit({
        type: AgentEventType.TOOL_RESULT,
        payload: results.results,
        timestamp: Date.now()
      });

      return JSON.stringify(results.results);
    }
  },
  {
    name: "web_search",
    description: "Search the web for up-to-date information.",
    schema: z.object({
      query: z.string()
    })
  }
)

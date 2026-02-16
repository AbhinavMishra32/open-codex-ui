import { tavily } from "@tavily/core";
import { tool } from "langchain";
import { z } from "zod";
import { AgentEventType, BaseTransport } from "../core/transport.js";

export const webSearch = tool(
  async ({ query }, config) => {
    const transport = config.configurable?.transport as BaseTransport;
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      const message = "TAVILY_API_KEY is not set, skipping web search.";
      if (transport) {
        await transport.emit({
          type: AgentEventType.TOOL_RESULT,
          payload: message,
          timestamp: Date.now()
        });
      }
      return message;
    }

    const tavilyClient = tavily({ apiKey });
    const results = await tavilyClient.search(query);

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

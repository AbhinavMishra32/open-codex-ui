import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { BaseTransport, AgentEventType } from "../core/transport.js";

export const askHuman = tool(
  async ({ question }, config) => {
    const transport = config.configurable?.transport as BaseTransport;

    if (transport) {
      await transport.emit({
        type: AgentEventType.MESSAGE,
        payload: question,
        timestamp: Date.now()
      });
    }

    return new Promise((resolve) => {
      if (!transport) {
        resolve("No transport available to ask human.");
        return;
      }

      transport.onInput(async (input) => {
        resolve(input);
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
);

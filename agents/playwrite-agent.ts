
import * as z from "zod";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";


async function main() {
  const model = new ChatOpenAI({
    model: "gpt-5-mini",
  });

  const client = new MultiServerMCPClient({
    playwright: {
      transport: "stdio",
      command: "npx",
      args: ["-y", "@executeautomation/playwright-mcp-server"],
    },
  });

  const tools = await client.getTools();

  const agent = createAgent({
    model,
    tools: tools,
  });

  const question = "Browse https://decipath.abhinavmishra.in and summarize what the website is about";

  const res = await agent.invoke(
    {
      messages: [
        {
          role: "system",
          content: `
          You are a browser agent.

            RULES:
            - You may call AT MOST 2 tools.
            - After tool results are returned, you MUST produce a final answer.
            - Do NOT call more tools after you have any page content.
            - If you cannot extract visible text, say so and STOP.
            `,
        },
        {
          role: "human",
          content:
            `
          URL: https://medium.com/
          You MUST do the following steps IN ORDER:

            1. Fetch the URL using playwright_get
          2. If the body is empty, say "SPA detected"
            3. Then try playwright_navigate ONCE
          4. Extract visible TEXT only
          5. Summarize and STOP
          `,
        },
      ],
    },
    { recursionLimit: 6 }
  );

  console.log(res);
};

main();

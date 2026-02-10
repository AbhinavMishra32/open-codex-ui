import * as z from "zod";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";


async function main() {
  const model = new ChatOpenAI({
    model: "gpt-5-nano",
  });

  const getTime = tool(
    ({ tz }: { tz?: string }) => {
      const now = new Date();
      if (tz === "utc") return now.toUTCString();
      return now.toString();
    },
    {
      name: "get_time",
      description: "Return the current server time. Accepts optional tz: 'utc'.",
      schema: z.object({
        tz: z.string().optional(),
      }),
    }
  )

  const add = tool(
    ({ a, b }: { a: number; b: number }) => {
      return `sum:${a + b}`;
    },
    {
      name: "add_numbers",
      description: "Add two numbers and return the result e.g. 'sum:5'.",
      schema: z.object({
        a: z.number(),
        b: z.number(),
      }),
    }
  );

  const agent = createAgent({
    model,
    tools: [getTime, add],
  });

  const question = "What's the time in UTC and what is 13 + 29?";

  const res = await agent.invoke(
    { messages: [{ role: "human", content: question }] },
  )

  console.log(res);
};

main();

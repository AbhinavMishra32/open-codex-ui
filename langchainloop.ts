import * as z from "zod";
import { createAgent, initChatModel, tool } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
// import fs from "node:fs"
import { readFile } from 'node:fs/promises';

const getWeather = tool(
  ({ city }) => `Its always sunny in  ${city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string(),
    }),
  },
);

const getFileContent = tool(
  async ({ filePath }) => {
    const content = await readFile(filePath, "utf8")
    return content;
  },
  {
    name: "get_file_content",
    description: "Get file's content given the file's path",
    schema: z.object({
      filePath: z.string(),
    }),
  }
)

const checkpointer = new MemorySaver();

const agent = createAgent({
  model: "gpt-5-mini",
  tools: [getWeather, getFileContent],
  checkpointer
});


const thread_id = "agent-thread-1";

console.log(
  await agent.invoke(
    { messages: [{ role: "human", content: "whats the content of ./main.ts ?" }] },
    { configurable: { thread_id } }
  )
)

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
  },
  {
    name: "get_file_content",
    description: "Get file's content given the file's path",
    schema: z.object({
      filePath: z.string(),
    }),
  }
)


const agent = createAgent({
  model: "gpt-5-mini",
  tools: [getWeather, getFileContent],
});

const checkpointer = new MemorySaver();

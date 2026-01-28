import { generateText, ToolLoopAgent } from 'ai';
import { openai } from '@ai-sdk/openai'
import type { ModelMessage } from '@ai-sdk/provider-utils';

// const { text } = await generateText({
//   model: openai("gpt-5-mini"),
//   prompt: "Hello, who are you?"
// });
//
// console.log(text.);
//
//
//
// type Message = {
//   role: 'user' | 'system';
//   content: string;
// }

const conversation: ModelMessage[] = [
  { role: 'system', content: 'You are an agent with access to web search.' }
]

// Create the agent. Some SDK tool helpers may have weak typings, cast as `any` to
// satisfy TypeScript while keeping intent clear.
const agent = new ToolLoopAgent({
  model: openai("gpt-5-mini") as any,
  instructions: 'You are an agent with access to web search.',
  tools: ({
    // webSearch helper may not have perfect types in the SDK; cast to any
    weather: (openai as any).tools?.webSearch?.() as any,
  } as any),
})

// Read stdin as utf8 strings so the data callback receives `string` (not Buffer).
process.stdin.setEncoding('utf8');
process.stdin.on("data", (input: string) => {
  const text = input.trim();
  if (!text) return;
  conversation.push({ role: "user", content: text });
})

async function main() {
  const result = await agent.generate({
    prompt: 'What happened on 28 jan 2026?, top global news',
    messages: conversation
  });

  // `result` typing can vary between SDK versions; prefer a safe print.
  if (typeof (result as any).text === 'string') {
    console.log((result as any).text);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(err => {
  console.error('agent error:', err);
  process.exit(1);
});

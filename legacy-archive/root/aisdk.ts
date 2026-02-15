import { generateText, ToolLoopAgent } from 'ai';
import { openai } from '@ai-sdk/openai'
import type { ModelMessage } from '@ai-sdk/provider-utils';

// const originalFetch = globalThis.fetch;
//
// globalThis.fetch = async (input: any, init?: any) => {
//   console.log("\n=== FETCH CALL ===");
//   console.log("URL:", input);
//   console.log("METHOD:", init?.method);
//   console.log("HEADERS:", init?.headers);
//   console.log("BODY:", init?.body);
//
//   const res = await originalFetch(input, init);
//
//   console.log("STATUS:", res.status);
//   console.log("=================\n");
//
//   return res;
// };

const conversation: ModelMessage[] = [
  { role: 'system', content: 'You are an agent with access to web search.' },
  // { role: 'user', content: 'What happened on 28 jan 2026?, top global news' }
]

const agent = new ToolLoopAgent({
  model: openai("gpt-5-mini") as any,
  instructions: 'You are an agent with access to web search.',
  tools: ({
    webSearch: openai.tools.webSearch(),
  }),
})

process.stdin.setEncoding('utf8');
process.stdin.on("data", async (input: string) => {
  const text = input.trim();
  if (!text) return;
  conversation.push({ role: "user", content: text });

  try {
    const result = await agent.generate({ messages: conversation });

    const assistantText = result.output;

    conversation.push({ role: 'assistant', content: assistantText });

    renderConversation();
    console.log("DEBUG: ", assistantText);
  } catch (err) {
    console.error('agent.generate error:', err);
  }
})

async function main() {
  renderConversation();
}

function renderConversation() {
  console.clear && console.clear();
  for (const message of conversation) {
    console.log(message.role === 'user' ? 'USER: ' : message.role === 'system' ? 'SYSTEM: ' : 'AI: ', message.content);
  }
}

main().catch(err => {
  console.error('agent error:', err);
  process.exit(1);
});

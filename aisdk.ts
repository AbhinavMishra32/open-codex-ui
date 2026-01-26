import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai'

const { text } = await generateText({
  model: openai("gpt-5-mini"),
  prompt: "Hello, who are you?"
});

console.log(text);

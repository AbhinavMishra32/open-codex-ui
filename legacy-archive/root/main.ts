import { OpenAILanguageModel } from "./OpenAILanguageModel";

const model = new OpenAILanguageModel('gpt-5-mini', {
  instructions: "you are hulk"
});

const { content } = await model.generate({
  prompt: [{
    role: 'system',
    content: 'you are hulk.'
  }, {
    role: 'user',
    content: 'who are you?'
  }],
  maxOutputTokens: 1000,
  responseFormat: { type: "text" }
})

console.log("content: ", content);

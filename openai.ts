import OpenAI from '@openai/openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY_TEMP'],
});

const response = await client.responses.create({
  model: 'gpt-5-mini',
  instructions: 'You are hulk from marvel, respond as if we are in avengers endgame movie',
  input: 'Hi!!!!! YOOOOOOOOOOOOO! WELCOME BACK!',
  stream: true,
});

// console.log(response.output_text);
// `response` is returned as a Stream-like object. At runtime it is async-iterable,
// but the SDK's TypeScript types don't expose the `[Symbol.asyncIterator]` signature
// on that type, so assert it to satisfy the compiler.
for await (const event of response as unknown as AsyncIterable<any>) {
  console.log(event);
}


// const completion = await client.chat.completions.create({
//   model: 'gpt-5-mini',
//   messages: [
//     { role: 'developer', content: 'You are hulk' },
//     { role: 'user', content: 'Hello! who are you?' },
//   ],
// });
//
// console.log("Completion object: ", completion);
// console.log("-------------------------")
// console.log(completion.choices[0].message.content);
//
//

import OpenAI from '@openai/openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY_TEMP'],
});

// const response = await client.responses.create({
//   model: 'gpt-5-mini',
//   instructions: 'You are hulk from marvel, respond as if we are in avengers endgame movie',
//   input: 'Hi!!!!! YOOOOOOOOOOOOO! WELCOME BACK!',
// });

// console.log(response.output_text);
//

const completion = await client.chat.completions.create({
  model: 'gpt-5-mini',
  messages: [
    { role: 'developer', content: 'You are hulk' },
    { role: 'user', content: 'Hello! who are you?' },
  ],
});

console.log("Completion object: ", completion);
console.log("-------------------------")
console.log(completion.choices[0].message.content);

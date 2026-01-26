import OpenAI from '@openai/openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY_TEMP'],
});

const response = await client.responses.create({
  model: 'gpt-5-mini',
  instructions: 'You are hulk from marvel, respond as if we are in avengers endgame movie',
  input: 'Hi!!!!! YOOOOOOOOOOOOO! WELCOME BACK!',
});

console.log(response.output_text);

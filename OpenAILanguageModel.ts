import { LanguageModel, LanguageModelGenerateOptions, LanguageModelGenerateResult } from "./LanguageModel";
import { OpenAI } from "@openai/openai";

export class OpenAILanguageModel implements LanguageModel {
  readonly modelId: OpenAIChatModelId;

  private readonly config: OpenAIChatConfig;
  private readonly openAIClient: OpenAI;

  constructor(modelId: OpenAIChatModelId, config: OpenAIChatConfig) {
    this.modelId = modelId;
    this.config = config;
    this.openAIClient = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'],
    });
  };

  async generate(options: LanguageModelGenerateOptions): Promise<LanguageModelGenerateResult> {
    const response = await this.openAIClient.responses.create({
      model: this.modelId,
      instructions: this.config.instructions,
      input: options.prompt,
    });
    return { content: response.output_text };
  }
}

type OpenAIChatConfig = {
  instructions: string;
}


// https://platform.openai.com/docs/models
export type OpenAIChatModelId =
  | 'o1'
  | 'o1-2024-12-17'
  | 'o3-mini'
  | 'o3-mini-2025-01-31'
  | 'o3'
  | 'o3-2025-04-16'
  | 'o4-mini'
  | 'o4-mini-2025-04-16'
  | 'gpt-4.1'
  | 'gpt-4.1-2025-04-14'
  | 'gpt-4.1-mini'
  | 'gpt-4.1-mini-2025-04-14'
  | 'gpt-4.1-nano'
  | 'gpt-4.1-nano-2025-04-14'
  | 'gpt-4o'
  | 'gpt-4o-2024-05-13'
  | 'gpt-4o-2024-08-06'
  | 'gpt-4o-2024-11-20'
  | 'gpt-4o-mini'
  | 'gpt-4o-mini-2024-07-18'
  | 'gpt-4-turbo'
  | 'gpt-4-turbo-2024-04-09'
  | 'gpt-4'
  | 'gpt-4-0613'
  | 'gpt-4.5-preview'
  | 'gpt-4.5-preview-2025-02-27'
  | 'gpt-3.5-turbo-0125'
  | 'gpt-3.5-turbo'
  | 'gpt-3.5-turbo-1106'
  | 'chatgpt-4o-latest'
  | 'gpt-5'
  | 'gpt-5-2025-08-07'
  | 'gpt-5-mini'
  | 'gpt-5-mini-2025-08-07'
  | 'gpt-5-nano'
  | 'gpt-5-nano-2025-08-07'
  | 'gpt-5-chat-latest'
  | 'gpt-5.1'
  | 'gpt-5.1-chat-latest'
  | 'gpt-5.2'
  | 'gpt-5.2-chat-latest'
  | 'gpt-5.2-pro'
  | (string & {});



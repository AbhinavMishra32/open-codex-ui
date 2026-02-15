import { JSONSchema7 } from 'json-schema';

export type LanguageModel = {

  readonly modelId: string;

  generate(options: LanguageModelGenerateOptions): PromiseLike<LanguageModelGenerateResult>;
}

export type LanguageModelGenerateOptions = {
  prompt: LanguageModelPrompt;
  maxOutputTokens?: number;

  temperature?: number;

  responseFormat?: {
    type: 'text';
  } | {
    type: 'json';

    schema?: JSONSchema7;
  }
}

type LanguageModelPrompt = Array<LanguageModelMessage>;

type LanguageModelMessage = ({
  role: 'system';
  content: string;
} | {
  role: 'user';
  content: string;
} | {
  role: 'assistant';
  content: string;
}) // TODO: add 'tool'

export type LanguageModelGenerateResult = {
  content: string;
}


type LanguageModel = {
  readonly provider: string;

  readonly modelId: string;

  readonly generate(options: )
}

type LanguageModelGenerateOptions = {
  prompt: LanguageModelPrompt;
  maxOutputTokens?: number;

  temperature?: number;

  responseFormat?: {
    type: 'text';
  } | {
    type: 'json';

    schema?: JSONSchema7;

    // name out output
    name?: string;

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

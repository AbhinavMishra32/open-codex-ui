type LanguageModel = {
  readonly provider: string;

  readonly modelId: string;

  readonly generate(options: )
}

type LanguageModelGenerateOptions = {
  prompt:
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

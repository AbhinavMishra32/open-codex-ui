import { ChatOpenAI } from "@langchain/openai";
import { CompiledStateGraph, StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { webSearch } from "../tools/webSearch.js";
import { type AIMessage, SystemMessage } from "@langchain/core/messages";
import type { ReasoningConfig, SupportedModel } from "../types/agent-api.js";

const tools = [webSearch];

export const DEFAULT_MODEL_ID = "gpt-5-nano";

export const SUPPORTED_MODELS: SupportedModel[] = [
  {
    id: "gpt-5-nano",
    label: "GPT-5 Nano",
    provider: "openai",
    supportsNativeReasoning: true,
    reasoning: {
      effortOptions: ["none", "minimal", "low", "medium", "high"],
      summaryOptions: ["auto", "concise", "detailed"],
      default: { effort: "medium", summary: "auto" },
    },
    isDefault: true,
  },
  {
    id: "gpt-5-mini",
    label: "GPT-5 Mini",
    provider: "openai",
    supportsNativeReasoning: true,
    reasoning: {
      effortOptions: ["none", "minimal", "low", "medium", "high"],
      summaryOptions: ["auto", "concise", "detailed"],
      default: { effort: "medium", summary: "auto" },
    },
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "openai",
    supportsNativeReasoning: false,
  },
];

const compiledGraphByModel = new Map<string, CompiledStateGraph<any, any, any>>();

function resolveModelId(requestedModelId?: string): string {
  if (!requestedModelId) return DEFAULT_MODEL_ID;
  return SUPPORTED_MODELS.some((model) => model.id === requestedModelId)
    ? requestedModelId
    : DEFAULT_MODEL_ID;
}

export function resolveReasoningConfig(
  modelId: string,
  requested?: Partial<ReasoningConfig>
): ReasoningConfig | null {
  const model = SUPPORTED_MODELS.find((item) => item.id === modelId);
  if (!model?.supportsNativeReasoning || !model.reasoning) return null;

  const selectedEffort =
    requested?.effort && model.reasoning.effortOptions.includes(requested.effort)
      ? requested.effort
      : model.reasoning.default.effort;

  const selectedSummary =
    requested?.summary && model.reasoning.summaryOptions.includes(requested.summary)
      ? requested.summary
      : model.reasoning.default.summary;

  return {
    effort: selectedEffort,
    summary: selectedSummary,
  };
}

function createModel(modelId: string, reasoning: ReasoningConfig | null) {
  const config: Record<string, unknown> = {
    modelName: modelId,
    streaming: true,
  };

  if (reasoning) {
    config.reasoning = reasoning;
  }

  return new ChatOpenAI(config).bindTools(tools);
}

function compileAgent(modelId: string, reasoning: ReasoningConfig | null): CompiledStateGraph<any, any, any> {
  const model = createModel(modelId, reasoning);

  return new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      const messages = [
        new SystemMessage("you are a helpful assistant. if you need clarification or more information from the human, always use the 'ask_human' tool. do not just ask questions in plain text."),
        ...state.messages,
      ];
      const response = await model.invoke(messages);
      return { messages: [response] };
    })
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, "agent")
    .addConditionalEdges("agent", (state) => {
      const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
      return lastMessage.tool_calls?.length ? "tools" : END;
    })
    .addEdge("tools", "agent")
    .compile();
}

function getGraphCacheKey(modelId: string, reasoning: ReasoningConfig | null): string {
  if (!reasoning) return `${modelId}|reasoning:none`;
  return `${modelId}|effort:${reasoning.effort}|summary:${reasoning.summary}`;
}

export function getAgent(
  requestedModelId?: string,
  reasoningInput?: Partial<ReasoningConfig>
): CompiledStateGraph<any, any, any> {
  const modelId = resolveModelId(requestedModelId);
  const reasoning = resolveReasoningConfig(modelId, reasoningInput);
  const cacheKey = getGraphCacheKey(modelId, reasoning);
  const existing = compiledGraphByModel.get(cacheKey);
  if (existing) return existing;

  const compiled = compileAgent(modelId, reasoning);
  compiledGraphByModel.set(cacheKey, compiled);
  return compiled;
}

export const agent = getAgent(DEFAULT_MODEL_ID);

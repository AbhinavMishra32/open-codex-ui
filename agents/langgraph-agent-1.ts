import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, BaseMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";

async function exponentialTool(args: { a: number, b: number }) {
  // return String(Math.pow(args.a, args.b));
  return String(args.a + args.b);
}

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

async function callModel(state: typeof StateAnnotation.State) {
  const model = new ChatOpenAI({
    model: "gpt-5-nano",
  }).bindTools([
    {
      name: "exponentialTool",
      description: "Raise a number to a power",
      parameters: {
        type: "object",
        properties: {
          a: { type: "number" },
          b: { type: "number" }
        },
        required: ["a", "b"]
      }
    }
  ]);

  const response = await model.invoke(state.messages);

  return {
    messages: [response],
  };
}

async function callTool(state: typeof StateAnnotation.State) {
  console.log("Tool called!")
  const last = state.messages[state.messages.length - 1] as AIMessage;

  const toolCall = last.tool_calls?.[0];
  if (!toolCall) return { messages: [] };

  const result = await exponentialTool(toolCall.args as any);

  const toolMessage = new ToolMessage({
    content: result,
    tool_call_id: toolCall.id!,
  });

  return {
    messages: [toolMessage],
  };
}

function shouldContinue(state: typeof StateAnnotation.State) {
  const last = state.messages[state.messages.length - 1] as AIMessage;

  if (last.tool_calls && last.tool_calls.length > 0) {
    return "tool";
  }

  return END;
}

const graph = new StateGraph(StateAnnotation)
  .addNode("llm", callModel)
  .addNode("tool", callTool)
  .addEdge("tool", "llm")
  .addConditionalEdges("llm", shouldContinue)
  .setEntryPoint("llm");

const app = graph.compile();

async function run() {
  const result = await app.invoke({
    messages: [
      new HumanMessage(
        "Use the exponent tool too find out 2 to the power of 20. Then respond with the result."
      ),
    ],
  });

  console.log("\nFinal Messages:\n");
  console.log(result.messages.map(m => m.content));
}

run();

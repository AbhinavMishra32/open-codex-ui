import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { askHuman } from "../tools/askHuman.js";
import { type AIMessage, SystemMessage } from "@langchain/core/messages";

const tools = [askHuman];
const model = new ChatOpenAI(
  {
    modelName: 'gpt-5-mini',
    streaming: true,
    reasoning: {
      effort: "medium",
      summary: "auto"
    }
  }
).bindTools(tools);

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", async (state) => {
    const messages = [
      new SystemMessage("You are a helpful assistant. If you need clarification or more information from the human, ALWAYS use the 'ask_human' tool. Do not just ask questions in plain text."),
      ...state.messages
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
  .addEdge("tools", "agent");

export const agent = graph.compile();



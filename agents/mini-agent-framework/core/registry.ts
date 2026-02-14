import { CompiledStateGraph } from "@langchain/langgraph";

export class AgentRegistry {
  private agents = new Map<string, CompiledStateGraph<any, any, any>>();

  register(id: string, graph: CompiledStateGraph<any, any, any>) {
    this.agents.set(id, graph);
  }

  get(id: string) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent with ID ${id} not found.`);
    return agent;
  }
}

export const registry = new AgentRegistry();

import { agent } from "./agent.js";
import { AgentEngine } from "./engine.js";
import { InkTransport } from "./ink-transport.js";

const transport = new InkTransport();

const engine = new AgentEngine(agent, transport);

transport.onInput(async (userInput) => {
  await engine.run(userInput);
});

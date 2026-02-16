import EventEmitter from "node:events";
import { AgentEvent, BaseTransport, AgentEventType } from "./transport.js";

export class InkTransport extends BaseTransport {
  private bus = new EventEmitter();

  constructor() {
    super();
  }

  async emit<T extends AgentEventType>(event: AgentEvent<T>) {
    this.bus.emit('data', event);
  }

  onInput(callback: (input: string) => Promise<void>): void {
    this.bus.on('user_input', callback);
  }

  // Helper for the React component to subscribe to events
  subscribe(callback: (event: AgentEvent) => void): () => void {
    this.bus.on('data', callback);
    return () => {
      this.bus.off('data', callback);
    };
  }

  // Helper to trigger input from the UI
  sendInput(input: string) {
    this.bus.emit('user_input', input);
  }
}

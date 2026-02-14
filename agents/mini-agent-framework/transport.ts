export type AgentEventType = 'thinking' | 'message' |
  'tool_call' | 'tool_result' | 'error' | 'status';

export interface AgentEvent {
  type: AgentEventType;
  payload: any;
  timestamp: number;
}

export abstract class BaseTransport {
  abstract emit(event: AgentEvent): Promise<void>;
  abstract onInput(callback: (input: string) => Promise<void>): void;
}

export const AgentEventType = {
  THINKING: 'thinking',
  MESSAGE: 'message',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  ERROR: 'error',
  STATUS: 'status'
} as const;

export type AgentEventType = typeof AgentEventType[keyof typeof AgentEventType];

export type PayloadMap = {
  [AgentEventType.THINKING]: string;
  [AgentEventType.MESSAGE]: string;
  [AgentEventType.TOOL_CALL]: any;
  [AgentEventType.TOOL_RESULT]: any;
  [AgentEventType.ERROR]: Error | string;
  [AgentEventType.STATUS]: string;
};

export interface AgentEvent<T extends AgentEventType = AgentEventType> {
  type: T;
  payload: PayloadMap[T];
  timestamp: number;
}

export abstract class BaseTransport {
  abstract emit<T extends AgentEventType>(event: AgentEvent<T>): Promise<void>;
  abstract onInput(callback: (input: string) => Promise<void>): void;
}

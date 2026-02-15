export type SessionId = string;
export type TurnId = string;
export type StepId = string;
export type MessageRole = "user" | "assistant";

export interface StepState {
  id: StepId;
  title: string;
  status: "running" | "completed" | "error";
  reasoning: string;
  tools: Array<{ name: string; status: "running" | "completed" | "error"; input?: unknown; output?: unknown }>;
}

export interface TurnState {
  id: TurnId;
  input: string;
  finalText: string;
  status: "running" | "completed" | "error";
  steps: StepState[];
  createdAt: number;
  completedAt: number;
}

export interface SessionState {
  id: SessionId;
  revision: number;
  messages: Array<{ role: MessageRole; text: string; turnId: TurnId }>;
  turns: TurnState[];
  createdAt: number;
  updatedAt: number;
}

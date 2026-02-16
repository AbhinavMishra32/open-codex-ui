import type { SessionState, SessionId } from "./types.js";

export interface SessionStore {
  get(sessionId: SessionId): Promise<SessionState | null>;
  create(sessionId: SessionId): Promise<SessionState>;
  save(session: SessionState): Promise<void>;
  list?(cursor?: string): Promise<{ items: SessionState[]; cursor?: string }>;
}

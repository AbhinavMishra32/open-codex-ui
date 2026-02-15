import { SessionState } from "node:http2"
import { SessionId } from "./types"

export interface SessionStore {
  get(sessionId: SessionId): Promise<SessionState | null>;
  create(sessionId: SessionId): Promise<SessionState>;
  save(session: SessionState): Promise<void>;
  list?(cursor?: string): Promise<{ items: SessionState[]; cursor?: string }>;
}

import { SessionStore } from "./session-store.js";
import { SessionState } from "./types.js";

export class MemorySessionStore implements SessionStore {
  private db = new Map<string, SessionState>();

  async get(id: string) {
    return this.db.get(id) ?? null;
  }

  async create(id: string) {
    const s: SessionState = {
      id,
      revision: 0,
      messages: [],
      turns: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.db.set(id, s);
    return s;
  }

  async save(session: SessionState) {
    session.revision += 1;
    session.updatedAt = Date.now();
    this.db.set(session.id, session);
  }
}

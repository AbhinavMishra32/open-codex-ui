import { describe, expect, it } from "vitest";
import { MemorySessionStore } from "../src/core/memory-session-store.js";

describe("MemorySessionStore", () => {
  it("returns null for missing sessions", async () => {
    const store = new MemorySessionStore();
    await expect(store.get("missing")).resolves.toBeNull();
  });

  it("creates and saves sessions with incrementing revision", async () => {
    const store = new MemorySessionStore();
    const session = await store.create("session-1");

    expect(session.id).toBe("session-1");
    expect(session.revision).toBe(0);
    expect(session.messages).toEqual([]);

    session.messages.push({ role: "user", text: "hello", turnId: "turn-1" });
    const beforeSaveUpdatedAt = session.updatedAt;
    await store.save(session);

    const fetched = await store.get("session-1");
    expect(fetched).not.toBeNull();
    expect(fetched?.revision).toBe(1);
    expect(fetched?.messages).toHaveLength(1);
    expect((fetched?.updatedAt ?? 0) >= beforeSaveUpdatedAt).toBe(true);
  });
});

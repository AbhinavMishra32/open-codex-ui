"use client";
import React, { useEffect, useState } from "react";

type Tool = {
  toolCallId: string;
  name: string;
  status: "running" | "completed" | "error";
};

type Step = {
  id: string;
  title: string;
  status: "running" | "completed" | "error";
  reasoning: string;
  assistantText: string;
  tools: Tool[];
};

type Turn = {
  id: string;
  input: string;
  finalText: string;
  status: "running" | "completed" | "error";
  steps: Step[];
  error?: string;
};

type Session = {
  id: string;
  turns: Turn[];
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SESSION_ID = "default";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [awaitingHumanInput, setAwaitingHumanInput] = useState(false);

  // Teaching note:
  // This loads the latest full session snapshot from NestJS.
  // We call it on page load and after SSE events.
  const hydrate = async () => {
    try {
      const res = await fetch(`${API}/agent/sessions/${SESSION_ID}`);
      if (!res.ok) return;
      setSession((await res.json()) as Session);
    } catch (error) {
      // API can be temporarily unavailable during startup; avoid throwing in render path.
      console.error("Failed to fetch session snapshot", error);
    }
  };

  useEffect(() => {
    void hydrate();

    // Teaching note:
    // SSE gives us push updates from backend while a turn is running.
    // We don't run the agent in UI; we only render streamed state.
    const es = new EventSource(`${API}/agent/sessions/${SESSION_ID}/stream`);

    es.onmessage = (msg) => {
      const envelope = JSON.parse(msg.data) as { event: { type: string; status?: string } };
      if (envelope.event.type === "status" && envelope.event.status === "human_input.requested") {
        setAwaitingHumanInput(true);
      }
      if (envelope.event.type === "status" && envelope.event.status === "human_input.received") {
        setAwaitingHumanInput(false);
      }
      void hydrate();
    };

    es.onerror = () => {
      // Keep UI alive even if stream reconnects.
      // Browser EventSource will retry automatically.
    };

    return () => es.close();
  }, []);

  // Teaching note:
  // Same input box supports two modes:
  // 1) normal turn submission
  // 2) answer to ask_human tool during an active turn
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");

    const url = awaitingHumanInput
      ? `${API}/agent/sessions/${SESSION_ID}/input`
      : `${API}/agent/sessions/${SESSION_ID}/turns`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: text }),
      });

      if (!res.ok) {
        // Minimal error handling for now; keeps flow understandable.
        console.error("Request failed", await res.text());
      }
    } catch (error) {
      // Avoid unhandled runtime errors while API is booting/restarting.
      console.error("Failed to send input to API", error);
    }

    if (awaitingHumanInput) setAwaitingHumanInput(false);
  };

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h2>Step-wise Agent (NestJS)</h2>

      <form onSubmit={send} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={awaitingHumanInput ? "Reply to tool question..." : "Ask anything..."}
          style={{ flex: 1, padding: 10 }}
        />
        <button type="submit">Send</button>
      </form>

      {(session?.turns ?? []).map((turn) => (
        <div key={turn.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div>
            <strong>User:</strong> {turn.input}
          </div>
          <div>
            <strong>Turn:</strong> {turn.status}
          </div>

          {turn.steps.map((step) => (
            <div key={step.id} style={{ marginTop: 10, padding: 10, border: "1px solid #eee", borderRadius: 6 }}>
              <div>
                <strong>{step.title}</strong> [{step.status}]
              </div>
              {step.reasoning ? <pre style={{ whiteSpace: "pre-wrap" }}>{step.reasoning}</pre> : null}
              {step.assistantText ? <pre style={{ whiteSpace: "pre-wrap" }}>{step.assistantText}</pre> : null}
              {step.tools.length > 0 ? (
                <ul>
                  {step.tools.map((t) => (
                    <li key={t.toolCallId}>
                      {t.name} - {t.status}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          {turn.error ? <div style={{ color: "crimson" }}>Error: {turn.error}</div> : null}
        </div>
      ))}
    </main>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import type {
  AgentSession,
  ReasoningEffortOption,
  ReasoningSummaryOption,
  StreamEnvelope,
  SupportedModel,
} from "@repo/agent-core";
import styles from "./App.module.css";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SESSION_ID = "default";

export function App() {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [input, setInput] = useState("");
  const [models, setModels] = useState<SupportedModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedReasoningEffort, setSelectedReasoningEffort] = useState<ReasoningEffortOption>("medium");
  const [selectedReasoningSummary, setSelectedReasoningSummary] = useState<ReasoningSummaryOption>("auto");
  const [awaitingHumanInput, setAwaitingHumanInput] = useState(false);

  // Teaching note:
  // This loads the latest full session snapshot from NestJS.
  // We call it on page load and after SSE events.
  const hydrate = async () => {
    try {
      const res = await fetch(`${API}/agent/sessions/${SESSION_ID}`);
      if (!res.ok) return;
      setSession((await res.json()) as AgentSession);
    } catch (error) {
      // API can be temporarily unavailable during startup; avoid throwing in render path.
      console.error("Failed to fetch session snapshot", error);
    }
  };

  // Teaching note:
  // Model metadata comes from API so every UI (web/electron/tui) reads the same source of truth.
  const hydrateModels = async () => {
    try {
      const res = await fetch(`${API}/agent/models`);
      if (!res.ok) return;
      const items = (await res.json()) as SupportedModel[];
      setModels(items);

      const defaultModel = items.find((item) => item.isDefault)?.id ?? items[0]?.id ?? "";
      setSelectedModelId((current) => current || defaultModel);
    } catch (error) {
      console.error("Failed to fetch model metadata", error);
    }
  };

  useEffect(() => {
    void hydrate();
    void hydrateModels();

    // Teaching note:
    // SSE gives us push updates from backend while a turn is running.
    // We don't run the agent in UI; we only render streamed state.
    const es = new EventSource(`${API}/agent/sessions/${SESSION_ID}/stream`);

    es.onmessage = (msg) => {
      const envelope = JSON.parse(msg.data) as StreamEnvelope;
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

  useEffect(() => {
    const model = models.find((item) => item.id === selectedModelId);
    const reasoning = model?.reasoning;
    if (!reasoning) return;

    setSelectedReasoningEffort((current) =>
      reasoning.effortOptions.includes(current)
        ? current
        : reasoning.default.effort
    );
    setSelectedReasoningSummary((current) =>
      reasoning.summaryOptions.includes(current)
        ? current
        : reasoning.default.summary
    );
  }, [models, selectedModelId]);

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

    const body = awaitingHumanInput
      ? { input: text }
      : {
        input: text,
        modelId: selectedModelId || undefined,
        reasoning: selectedModel?.reasoning
          ? {
            effort: selectedReasoningEffort,
            summary: selectedReasoningSummary,
          }
          : undefined,
      };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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

  const selectedModel = models.find((item) => item.id === selectedModelId);
  const turns = session?.turns ?? [];

  const formatTime = (time: number) =>
    new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <main className={styles.page}>
      <section className={styles.feed}>
        <header className={styles.feedHeader}>
          <div className={styles.title}>Step-wise Agent</div>
          <div className={styles.subtitle}>
            NestJS API + SSE stream {awaitingHumanInput ? "• waiting for human input" : ""}
          </div>
        </header>

        {turns.length === 0 ? (
          <div className={styles.emptyState}>No turns yet. Send your first prompt below.</div>
        ) : null}

        {turns.map((turn) => (
          <article key={turn.id} className={styles.turnBlock}>
            <div className={styles.userBubble}>{turn.input}</div>

            <div className={styles.assistantCard}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>model</span>
                <span className={styles.metaValue}>{turn.modelId}</span>
                <span className={styles.metaDot}>•</span>
                <span className={styles.metaLabel}>reasoning</span>
                <span className={styles.metaValue}>
                  {turn.reasoning ? `${turn.reasoning.effort} / ${turn.reasoning.summary}` : "n/a"}
                </span>
                <span className={styles.metaDot}>•</span>
                <span className={styles.metaLabel}>status</span>
                <span className={styles.metaValue}>{turn.status}</span>
                <span className={styles.metaDot}>•</span>
                <span className={styles.metaValue}>{formatTime(turn.createdAt)}</span>
              </div>

              {turn.steps.flatMap((step) => step.tools).length > 0 ? (
                <div className={styles.toolsPanel}>
                  {turn.steps.flatMap((step) => step.tools).map((tool) => (
                    <div key={tool.toolCallId} className={styles.toolRow}>
                      <span className={styles.toolName}>{tool.name}</span>
                      <span
                        className={`${styles.toolStatus} ${
                          tool.status === "completed"
                            ? styles.toolStatusCompleted
                            : tool.status === "error"
                              ? styles.toolStatusError
                              : styles.toolStatusRunning
                        }`}
                      >
                        {tool.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {turn.steps.map((step) => (
                <div key={step.id} className={styles.stepCard}>
                  <div className={styles.stepTitle}>
                    {step.title} <span className={styles.stepStatus}>[{step.status}]</span>
                  </div>
                  {step.reasoning ? <pre className={styles.reasoningText}>{step.reasoning}</pre> : null}
                  {step.assistantText ? <pre className={styles.assistantText}>{step.assistantText}</pre> : null}
                </div>
              ))}

              {turn.error ? <div className={styles.errorText}>Error: {turn.error}</div> : null}
            </div>
          </article>
        ))}
      </section>

      <form onSubmit={send} className={styles.composer}>
        <div className={styles.composerControls}>
          <select
            id="modelId"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className={styles.select}
            disabled={awaitingHumanInput}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>

          {selectedModel?.reasoning ? (
            <>
              <select
                id="reasoningEffort"
                value={selectedReasoningEffort}
                onChange={(e) => setSelectedReasoningEffort(e.target.value as ReasoningEffortOption)}
                className={styles.select}
                disabled={awaitingHumanInput}
              >
                {selectedModel.reasoning.effortOptions.map((effort) => (
                  <option key={effort} value={effort}>
                    effort: {effort}
                  </option>
                ))}
              </select>
              <select
                id="reasoningSummary"
                value={selectedReasoningSummary}
                onChange={(e) => setSelectedReasoningSummary(e.target.value as ReasoningSummaryOption)}
                className={styles.select}
                disabled={awaitingHumanInput}
              >
                {selectedModel.reasoning.summaryOptions.map((summary) => (
                  <option key={summary} value={summary}>
                    summary: {summary}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>

        <div className={styles.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={awaitingHumanInput ? "Reply to tool question..." : "Ask for follow-up changes"}
            className={styles.input}
          />
          <button type="submit" className={styles.sendButton}>
            Send
          </button>
        </div>
      </form>
    </main>
  );
}

"use client";
import React, { useEffect, useMemo, useState } from "react";
import type {
  AgentSession,
  AgentTurn,
  ReasoningEffortOption,
  ReasoningSummaryOption,
  StreamEnvelope,
  SupportedModel,
} from "@repo/agent-core";
import styles from "./App.module.css";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SESSION_ID = "default";

function formatThoughtDuration(ms?: number): string {
  if (!ms) return "Thought for a moment";
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) {
    if (seconds <= 3) return "Thought for a couple of seconds";
    return `Thought for ${seconds} seconds`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes === 1) return "Thought for a minute";
  return `Thought for ${minutes} minutes`;
}

function getAssistantText(turn: AgentTurn): string {
  if (turn.finalText.trim()) return turn.finalText;
  return turn.steps
    .map((step) => step.assistantText)
    .filter((text) => text.trim().length > 0)
    .join("\n\n");
}

export function App() {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [input, setInput] = useState("");
  const [models, setModels] = useState<SupportedModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedReasoningEffort, setSelectedReasoningEffort] = useState<ReasoningEffortOption>("medium");
  const [selectedReasoningSummary, setSelectedReasoningSummary] = useState<ReasoningSummaryOption>("auto");
  const [awaitingHumanInput, setAwaitingHumanInput] = useState(false);

  const hydrate = async () => {
    try {
      const res = await fetch(`${API}/agent/sessions/${SESSION_ID}`);
      if (!res.ok) return;
      setSession((await res.json()) as AgentSession);
    } catch (error) {
      console.error("Failed to fetch session snapshot", error);
    }
  };

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

    return () => es.close();
  }, []);

  useEffect(() => {
    const model = models.find((item) => item.id === selectedModelId);
    const reasoning = model?.reasoning;
    if (!reasoning) return;

    setSelectedReasoningEffort((current) =>
      reasoning.effortOptions.includes(current) ? current : reasoning.default.effort
    );
    setSelectedReasoningSummary((current) =>
      reasoning.summaryOptions.includes(current) ? current : reasoning.default.summary
    );
  }, [models, selectedModelId]);

  const selectedModel = useMemo(
    () => models.find((item) => item.id === selectedModelId),
    [models, selectedModelId]
  );

  const submitCurrentInput = async () => {
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
        console.error("Request failed", await res.text());
      }
    } catch (error) {
      console.error("Failed to send input to API", error);
    }

    if (awaitingHumanInput) setAwaitingHumanInput(false);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCurrentInput();
  };

  const turns = session?.turns ?? [];

  const formatTime = (time: number) =>
    new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <main className={styles.page}>
      <section className={styles.timeline}>
        {turns.length === 0 ? (
          <div className={styles.emptyState}>Start a turn to see reasoning and response timeline.</div>
        ) : null}

        {turns.map((turn) => {
          const reasoningSteps = turn.steps.filter((step) => step.reasoning.trim().length > 0);
          const assistantText = getAssistantText(turn);
          const thoughtMs =
            typeof turn.completedAt === "number"
              ? Math.max(0, turn.completedAt - turn.createdAt)
              : undefined;

          return (
            <article key={turn.id} className={styles.turn}>
              <div className={styles.userRow}>
                <div className={styles.userBubble}>{turn.input}</div>
              </div>

              <div className={styles.assistantRow}>
                {reasoningSteps.map((step) => (
                  <details key={`${turn.id}-${step.id}`} className={styles.thinkingBlock}>
                    <summary className={styles.thinkingSummary}>
                      <span>Thinking</span>
                      <span className={styles.thinkingChevron}>›</span>
                    </summary>

                    <div className={styles.thinkingPanel}>
                      <div className={styles.reasonItem}>
                        <span className={styles.reasonBullet}>•</span>
                        <div className={styles.reasonMain}>
                          <div className={styles.reasonTitle}>{step.title || "Reasoning"}</div>
                          <div className={styles.reasonBody}>
                            {step.reasoning
                              .split("\n")
                              .filter((line) => line.trim().length > 0)
                              .map((line, idx) => (
                                <p key={idx} className={styles.reasonParagraph}>
                                  {line}
                                </p>
                              ))}
                          </div>
                        </div>
                      </div>

                      <div className={styles.reasonFooter}>
                        <span className={styles.reasonDoneIcon}>✓</span>
                        <div>
                          <div className={styles.reasonDoneTitle}>{formatThoughtDuration(thoughtMs)}</div>
                          <div className={styles.reasonDoneSub}>Done</div>
                        </div>
                      </div>
                    </div>
                  </details>
                ))}

                {assistantText ? (
                  <div className={styles.assistantMessage}>
                    {assistantText
                      .split("\n")
                      .filter((line) => line.trim().length > 0)
                      .map((line, idx) => (
                        <p key={idx} className={styles.assistantParagraph}>
                          {line}
                        </p>
                      ))}
                  </div>
                ) : null}

                {turn.error ? <div className={styles.errorText}>Error: {turn.error}</div> : null}
              </div>
            </article>
          );
        })}
      </section>

      <form onSubmit={send} className={styles.composer}>
        <div className={styles.inputShell}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitCurrentInput();
              }
            }}
            placeholder={awaitingHumanInput ? "Reply to tool question..." : "Ask anything"}
            className={styles.input}
            rows={1}
          />
          <div className={styles.inputActions}>
            <button type="button" className={styles.micButton} aria-label="Voice input">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button type="submit" className={styles.sendButton} aria-label="Send message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l0 18M12 3l-7 7M12 3l7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <button type="button" className={styles.plusButton} aria-label="Add attachment">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <select
            id="modelId"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className={styles.toolbarSelect}
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
                className={styles.toolbarSelect}
                disabled={awaitingHumanInput}
              >
                {selectedModel.reasoning.effortOptions.map((effort) => (
                  <option key={effort} value={effort}>
                    {effort}
                  </option>
                ))}
              </select>

              <select
                id="reasoningSummary"
                value={selectedReasoningSummary}
                onChange={(e) => setSelectedReasoningSummary(e.target.value as ReasoningSummaryOption)}
                className={styles.toolbarSelect}
                disabled={awaitingHumanInput}
              >
                {selectedModel.reasoning.summaryOptions.map((summary) => (
                  <option key={summary} value={summary}>
                    {summary}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <div className={styles.statusPill}>
            {awaitingHumanInput ? "Waiting for your tool reply" : ""}
          </div>
        </div>
      </form>

      {/* ── Bottom Status Bar ── */}
      <footer className={styles.statusBar}>
        <div className={styles.statusBarLeft}>
          <button type="button" className={styles.statusItem}>
            <span className={styles.statusIcon}>☐</span>
            Local
            <span className={styles.statusChevron}>˅</span>
          </button>
          <button type="button" className={styles.statusItem}>
            <span className={styles.statusIcon}>◎</span>
            Default permissions
            <span className={styles.statusChevron}>˅</span>
          </button>
        </div>

        <div className={styles.statusBarRight}>
          <button type="button" className={styles.statusItem}>
            <span className={styles.statusIcon}>⑂</span>
            main
            <span className={styles.statusChevron}>˅</span>
          </button>
          <div className={styles.spinner} />
        </div>
      </footer>
    </main>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import UserMessage from "./messages/UserMessage";
import AssistantMessage from "./messages/AssistantMessage";
import Reasoning from "./messages/Reasoning";
import type { SessionState } from "../core/types";

type ThemeMode = "light" | "dark" | "system";

interface UIMessage {
  role: "user" | "assistant" | "assistant_reasoning" | "tool_call" | "system";
  text: string;
}

declare global {
  interface Window {
    agentApi: {
      EVENT_TYPES: any;
      sendPrompt: (prompt: string) => Promise<void>;
      getSession: () => Promise<SessionState>;
      onEvent: (callback: (event: { type: string; payload: any }) => void) => () => void;
    };
  }
}

const roleComponentMap: Record<UIMessage["role"], React.ComponentType<{ content: string }> | null> = {
  user: UserMessage,
  assistant: AssistantMessage,
  assistant_reasoning: Reasoning,
  system: ({ content }: { content: string }) => <div>{content}</div>,
  tool_call: null,
};

function resolveSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  const isDark = mode === "dark" || (mode === "system" && resolveSystemTheme() === "dark");
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function App() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  const hydrateFromSession = async () => {
    const s = await window.agentApi.getSession();
    const ui: UIMessage[] = s.messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));
    setMessages(ui);
  };

  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeMode | null;
    const mode: ThemeMode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setThemeMode(mode);
    applyTheme(mode);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (themeMode === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", themeMode);
    }

    applyTheme(themeMode);

    if (themeMode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themeMode, mounted]);

  useEffect(() => { hydrateFromSession(); }, []);
  useEffect(() => {
    const { EVENT_TYPES } = window.agentApi;
    const unsubscribe = window.agentApi.onEvent((event) => {
      switch (event.type) {
        case EVENT_TYPES.THINKING:
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant_reasoning") {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                text: lastMessage.text + (event.payload as string),
              };
              return updated;
            }

            return [...prev, { role: "assistant_reasoning", text: event.payload as string }];
          });
          break;

        case EVENT_TYPES.MESSAGE:
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant") {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                text: lastMessage.text + (event.payload as string),
              };
              return updated;
            }

            return [...prev, { role: "assistant", text: event.payload as string }];
          });
          break;

        case EVENT_TYPES.TOOL_CALL:
          console.log("Agent calling tool: ", event.payload);
          break;

        case EVENT_TYPES.ERROR:
          alert(`Error: ${event.payload}`);
          break;
      }
    });

    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");
    await window.agentApi.sendPrompt(input);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-6 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <h1 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Mini Agent</h1>
        <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          Theme
          <select
            value={themeMode}
            onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-5xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto">
          {messages.map((m: UIMessage, i) => {
            const Component = roleComponentMap[m.role];
            if (!Component) return null;
            return <Component key={i} content={m.text} />;
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";
import React, { Component, useEffect, useRef, useState } from "react";
import UserMessage from "./src/components/UserMessage";
import AssistantMessage from "./src/components/AssistantMessage";
import Reasoning from "./src/components/Reasoning";

interface UIMessage {
  role: 'user' | 'assistant' | 'assistant_reasoning' | 'tool_call' | 'system';
  content: string;
}

declare global {
  interface Window {
    agentApi: {
      EVENT_TYPES: any;
      sendPrompt: (prompt: string) => Promise<void>;
      onEvent: (callback: (event: { type: string; payload: any }) => void) => () => void;
    };
  }
}

const roleComponentMap: Record<UIMessage['role'], React.ComponentType<{ content: string }> | null> = {
  user: UserMessage,
  assistant: AssistantMessage,
  assistant_reasoning: Reasoning,
  system: ({ content }: { content: string }) => <div>{content}</div>,
  tool_call: null,
};

export function AgentChat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const { EVENT_TYPES } = window.agentApi;
    // subscribe to agent events
    const unsubscribe = window.agentApi.onEvent((event) => {
      switch (event.type) {
        case EVENT_TYPES.THINKING:
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'assistant_reasoning') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + (event.payload as string)
              };
              return updated;
            } else {
              return [...prev, { role: 'assistant_reasoning', content: event.payload as string }];
            }
          });
          break;

        case EVENT_TYPES.MESSAGE:
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'assistant') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + (event.payload as string)
              };
              return updated;
            } else {
              return [...prev, { role: 'assistant', content: event.payload as string }];
            }
          });
          break;

        case EVENT_TYPES.TOOL_CALL:
          console.log("Agent calling tool: ", event.payload);
          break;

        case EVENT_TYPES.ERROR:
          // setThinking(null);
          alert(`Error: ${event.payload}`);
          break;
      }
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);

    await window.agentApi.sendPrompt(input);
    setInput("");
  };


  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((m: UIMessage, i) => {
          const Component = roleComponentMap[m.role];

          if (!Component) return null;

          return <Component key={i} content={m.content} />;
        })}
      </div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

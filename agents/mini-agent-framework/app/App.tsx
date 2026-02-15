"use client";
import React, { useEffect, useRef, useState } from "react";

interface UIMessage {
  role: 'user' | 'assistant' | 'assistant_reasoning' | 'tool_call';
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

export function AgentChat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  // const [thinking, setThinking] = useState<string | null>(null);

  const currentResponseRef = useRef("");

  useEffect(() => {
    const { EVENT_TYPES } = window.agentApi;
    // subscribe to agent events
    const unsubscribe = window.agentApi.onEvent((event) => {
      switch (event.type) {
        case EVENT_TYPES.THINKING:
          // setThinking((prev) => (prev ? prev + (event.payload as string) : (event.payload as string)));
          setMessages((prev) => [...prev, { role: 'assistant_reasoning', content: event.payload as string }]);
          break;

        case EVENT_TYPES.MESSAGE:
          // setThinking(null);
          currentResponseRef.current += event.payload;

          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'assistant') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                content: currentResponseRef.current
              };
              return updated;
            } else {
              return [...prev, { role: 'assistant', content: event.payload }];
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

    // reset stream tracking
    currentResponseRef.current = "";

    setMessages(prev => [...prev, { role: 'user', content: input }]);

    await window.agentApi.sendPrompt(input);
    setInput("");
  };


  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

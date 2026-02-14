import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import { InkTransport } from './ink-transport.js';
import { AgentEventType, type AgentEvent } from './transport.js';
import { AgentEngine } from './engine.js';
import { agent } from './agent.js';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Initialize marked with terminal renderer
marked.setOptions({
  renderer: new TerminalRenderer()
});

const transport = new InkTransport();
const engine = new AgentEngine(agent, transport);

interface Message {
  sender: 'user' | 'assistant';
  content: string;
}

function Cli() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isWaitingForHuman, setIsWaitingForHuman] = useState(false);

  useEffect(() => {
    const unsubscribe = transport.subscribe((event: AgentEvent) => {
      if (event.type === AgentEventType.MESSAGE) {
        setThinking(null);
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.sender === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, content: lastMsg.content + (event.payload as string) }
            ];
          } else {
            return [...prev, { sender: 'assistant', content: event.payload as string }];
          }
        });
      } else if (event.type === AgentEventType.THINKING) {
        setThinking((prev) => (prev ? prev + (event.payload as string) : (event.payload as string)));
      } else if (event.type === AgentEventType.TOOL_CALL) {
        if (event.payload.name === 'ask_human') {
          setIsWaitingForHuman(true);
        }
      }
    });

    return unsubscribe;
  }, []);

  useInput((inputStr, key) => {
    if (key.return) {
      const currentInput = input;
      setInput('');
      setMessages((prev) => [...prev, { sender: 'user', content: currentInput }]);

      if (isWaitingForHuman) {
        setIsWaitingForHuman(false);
        transport.sendInput(currentInput);
      } else {
        engine.run(currentInput).catch(console.error);
      }
    } else if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
    } else {
      setInput((prev) => prev + inputStr);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, i) => (
          <Text key={i}>
            <Text bold color={msg.sender === 'user' ? 'green' : 'blue'}>
              {msg.sender === 'user' ? 'You: ' : 'Agent: '}
            </Text>
            <Text>{marked.parse(msg.content) as string}</Text>
          </Text>
        ))}
        {thinking && (
          <Text italic color="cyanBright">
            Thinking: {marked.parse(thinking) as string}
          </Text>
        )}
        {isWaitingForHuman && (
          <Text bold color="yellow">
            (Agent is waiting for your response...)
          </Text>
        )}
      </Box>
      <Box>
        <Text bold color="cyan">
          {isWaitingForHuman ? '? ' : '> '}
        </Text>
        <Text>{input}</Text>
      </Box>
    </Box>
  );
}

render(<Cli />);

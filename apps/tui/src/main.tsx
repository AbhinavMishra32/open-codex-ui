import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import { InkTransport, AgentEventType, type AgentEvent, AgentEngine, agent } from '@repo/agent-core';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Initialize marked with terminal renderer
marked.setOptions({
  renderer: new TerminalRenderer() as any
});

const transport = new InkTransport();
const engine = new AgentEngine(agent, transport);

interface Message {
  sender: 'user' | 'assistant' | 'tool_result';
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
      } else if (event.type === AgentEventType.TOOL_RESULT) {
        setMessages((prev) => [...prev, { sender: 'tool_result', content: event.payload }])
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
        engine.run([{ role: 'user', text: currentInput }]).catch(console.error);
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
          <Box>
            <Text key={i}>
              <Text bold color={msg.sender === 'user' ? 'greenBright' : 'blueBright'}>
                {msg.sender === 'user' ? 'You: ' : msg.sender === 'tool_result' ? 'Tool Result: ' : 'Agent: '}
              </Text>
              <Text>{msg.sender !== 'tool_result' && marked.parse(msg.content) as string}</Text>
            </Text>
          </Box>
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
      <Box borderStyle={'round'}>
        <Text bold color="cyan">
          {isWaitingForHuman ? '? ' : '> '}
        </Text>
        <Text>{input}</Text>
      </Box>
    </Box>
  );
}

render(<Cli />);

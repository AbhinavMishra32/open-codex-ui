import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { bus } from './src/core/event-bus.js';


type Message = {
  role: 'ai' | 'human' | 'system' | 'tool-call' | 'tool-result';
  text: string;
}

function App() {

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hello!' }
  ]);

  useEffect(() => {
    const unsubAgent = bus.on('agent:message', (data) => {
      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    });
    const unsubHuman = bus.on('human:input', (data) => {
      setMessages(prev => [...prev, { role: 'human', text: data.text }]);
    });
    const unsubToolCall = bus.on('tool:call', (data) => {
      setMessages(prev => [...prev, { role: 'tool-call', text: `${data.name}(${JSON.stringify(data.args)})` }]);
    });
    const unsubToolResult = bus.on('tool:result', (data) => {
      setMessages(prev => [...prev, { role: 'tool-result', text: `Result of ${data.name}: ${data.result}` }]);
    });
    return () => {
      unsubAgent();
      unsubHuman();
      unsubToolCall();
      unsubToolResult();
    };
  }, []);

  return (
    <Box flexDirection="column" borderColor="red" borderLeft={true} padding={1}>
      <ChatHistory messages={messages} />
    </Box>
  );
}

function ChatHistory(props: { messages: Message[] }) {
  const { messages } = props;

  const getBorderColor = (role: Message['role']) => {
    switch (role) {
      case 'ai': return 'blue';
      case 'human': return 'green';
      case 'tool-call': return 'yellow';
      case 'tool-result': return 'magenta';
      default: return 'white';
    }
  };

  return (
    <Box flexDirection="column" paddingBottom={1}>
      {messages.map((msg, i) => (
        <Box key={i} marginBottom={1}>
          <Box borderColor={getBorderColor(msg.role)} borderStyle={'round'}>
            <Text>{msg.role} : {msg.text}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

render(<App />);

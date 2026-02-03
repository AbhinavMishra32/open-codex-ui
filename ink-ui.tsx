import React, { useState } from 'react';
import { render, Box, Text } from 'ink';


type Message = {
  role: 'ai' | 'human' | 'system';
  text: string;
}

function App() {

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hello!' }
  ]);

  return (
    <Box flexDirection="column" borderColor="red" borderLeft={true} padding={1}>
      <ChatHistory messages={messages} />
    </Box>
  );
}

function ChatHistory(props: { messages: Message[] }) {
  const { messages } = props;

  return (
    <Box flexDirection="column" paddingBottom={1}>
      {messages.map((msg, i) => (
        <Box key={i} marginBottom={1}>
          <Box borderColor={msg.role === 'ai' ? 'blue' : 'green'} borderStyle={'round'}>
            <Text>{msg.role} : {msg.text}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

render(<App />);

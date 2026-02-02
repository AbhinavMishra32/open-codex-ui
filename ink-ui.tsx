import React from 'react';
import { render, Box, Text } from 'ink';

function App() {
  return (
    <Box backgroundColor="green" borderColor="red" border={3}>
      <Text>Chat App</Text>
    </Box>
  );
}

render(<App />);

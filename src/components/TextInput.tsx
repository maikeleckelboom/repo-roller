/**
 * @module components/TextInput
 *
 * Simple text input component for terminal UI
 */

import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface TextInputProps {
  prompt: string;
  defaultValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
}

export const TextInput: React.FC<TextInputProps> = ({
  prompt,
  defaultValue = '',
  placeholder = '',
  onSubmit,
}) => {
  const [value, setValue] = useState(defaultValue);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value || defaultValue);
      exit();
      return;
    }

    if (key.escape || (key.ctrl && input === 'c')) {
      onSubmit(defaultValue);
      exit();
      return;
    }

    if (key.backspace || key.delete) {
      setValue(value.slice(0, -1));
      return;
    }

    // Only add printable characters
    if (input && !key.ctrl && !key.meta) {
      setValue(value + input);
    }
  });

  const displayValue = value || placeholder;
  const displayColor = value ? 'white' : 'gray';

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">{prompt}</Text>
      </Box>
      <Box>
        <Text color="gray">{'> '}</Text>
        <Text color={displayColor}>{displayValue}</Text>
        <Text color="cyanBright">{'█'}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          <Text color="greenBright">Enter</Text> to confirm · <Text color="red">Esc</Text> to use default
        </Text>
      </Box>
    </Box>
  );
};

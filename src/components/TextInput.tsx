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
  const [cursorPosition, setCursorPosition] = useState(defaultValue.length);
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

    // Navigate cursor with left/right arrows or < >
    if (key.leftArrow || input === '<') {
      setCursorPosition(Math.max(0, cursorPosition - 1));
      return;
    }

    if (key.rightArrow || input === '>') {
      setCursorPosition(Math.min(value.length, cursorPosition + 1));
      return;
    }

    // Move to start/end with Home/End or Ctrl+A/E
    if ((key.ctrl && input === 'a') || input === '\x01') {
      setCursorPosition(0);
      return;
    }

    if ((key.ctrl && input === 'e') || input === '\x05') {
      setCursorPosition(value.length);
      return;
    }

    // Backspace: delete character before cursor
    if (key.backspace) {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        setValue(newValue);
        setCursorPosition(cursorPosition - 1);
      }
      return;
    }

    // Delete: delete character at cursor
    if (key.delete) {
      if (cursorPosition < value.length) {
        const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
        setValue(newValue);
      }
      return;
    }

    // Only add printable characters (excluding < and > which are used for navigation)
    if (input && !key.ctrl && !key.meta && input !== '<' && input !== '>') {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(cursorPosition + 1);
    }
  });

  // Split text at cursor position for rendering
  const textBeforeCursor = value.slice(0, cursorPosition);
  const textAtCursor = value[cursorPosition] || ' ';
  const textAfterCursor = value.slice(cursorPosition + 1);

  const displayValue = value || placeholder;
  const displayColor = value ? 'white' : 'gray';
  const showCursor = value.length > 0;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">{prompt}</Text>
      </Box>
      <Box>
        <Text color="gray">{'> '}</Text>
        {showCursor ? (
          <>
            <Text color={displayColor}>{textBeforeCursor}</Text>
            <Text color="black" backgroundColor="cyanBright">{textAtCursor}</Text>
            <Text color={displayColor}>{textAfterCursor}</Text>
          </>
        ) : (
          <>
            <Text color={displayColor}>{displayValue}</Text>
            <Text color="cyanBright">{'█'}</Text>
          </>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          <Text color="greenBright">←→</Text> navigate · <Text color="greenBright">Enter</Text> confirm · <Text color="red">Esc</Text> default
        </Text>
      </Box>
    </Box>
  );
};

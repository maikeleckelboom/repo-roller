/**
 * @module components/TextInput
 *
 * Simple text input component for terminal UI
 */

import React, { useState, useRef, useEffect } from 'react';
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

  // Use refs to track latest state values for input handler
  const valueRef = useRef(value);
  const cursorRef = useRef(cursorPosition);

  useEffect(() => {
    valueRef.current = value;
    cursorRef.current = cursorPosition;
  }, [value, cursorPosition]);

  useInput((input, key) => {
    if (key.return) {
      onSubmit(valueRef.current || defaultValue);
      exit();
      return;
    }

    if (key.escape || (key.ctrl && input === 'c')) {
      onSubmit(defaultValue);
      exit();
      return;
    }

    // Navigate cursor with left/right arrows only (not < > to allow typing those characters)
    if (key.leftArrow) {
      setCursorPosition(pos => Math.max(0, pos - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPosition(pos => Math.min(valueRef.current.length, pos + 1));
      return;
    }

    // Move to start/end with Home/End or Ctrl+A/E
    if ((key.ctrl && input === 'a') || input === '\x01') {
      setCursorPosition(0);
      return;
    }

    if ((key.ctrl && input === 'e') || input === '\x05') {
      setCursorPosition(valueRef.current.length);
      return;
    }

    // Backspace: delete character before cursor
    if (key.backspace || key.delete) {
      const currentPos = cursorRef.current;
      const currentValue = valueRef.current;

      if (key.backspace && currentPos > 0) {
        const newValue = currentValue.slice(0, currentPos - 1) + currentValue.slice(currentPos);
        setValue(newValue);
        setCursorPosition(currentPos - 1);
      } else if (key.delete && currentPos < currentValue.length) {
        const newValue = currentValue.slice(0, currentPos) + currentValue.slice(currentPos + 1);
        setValue(newValue);
      }
      return;
    }

    // Only add printable characters (exclude newlines and control characters)
    if (input && !key.ctrl && !key.meta && input !== '\n' && input !== '\r') {
      const currentPos = cursorRef.current;
      const currentValue = valueRef.current;
      const newValue = currentValue.slice(0, currentPos) + input + currentValue.slice(currentPos);
      setValue(newValue);
      setCursorPosition(currentPos + 1);
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
            <Text color={displayColor} wrap="truncate">{textBeforeCursor}</Text>
            <Text color="black" backgroundColor="cyanBright" wrap="truncate">{textAtCursor}</Text>
            <Text color={displayColor} wrap="truncate">{textAfterCursor}</Text>
          </>
        ) : (
          <>
            <Text color={displayColor} wrap="truncate">{displayValue}</Text>
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

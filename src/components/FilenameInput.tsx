/**
 * @module components/FilenameInput
 *
 * Filename input component for interactive mode.
 * Provides a user-friendly text input for customizing the output filename.
 * The file extension is automatically added based on the selected format.
 */

import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { OutputFormat } from '../core/types.js';

interface FilenameInputProps {
  defaultFilename: string;
  format: OutputFormat;
  onSubmit: (filename: string) => void;
  onCancel: () => void;
}

export const FilenameInput: React.FC<FilenameInputProps> = ({
  defaultFilename,
  format,
  onSubmit,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultFilename);
  const [cursorPosition, setCursorPosition] = useState(defaultFilename.length);
  const { exit } = useApp();

  useInput((input, key) => {
    // Cancel on Escape or Q
    if (key.escape || input === 'q' || input === 'Q') {
      onCancel();
      exit();
      return;
    }

    // Submit on Enter
    if (key.return) {
      const trimmedValue = value.trim();
      if (trimmedValue.length > 0) {
        onSubmit(trimmedValue);
        exit();
      }
      return;
    }

    // Handle backspace
    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        setValue(newValue);
        setCursorPosition(cursorPosition - 1);
      }
      return;
    }

    // Handle left arrow
    if (key.leftArrow) {
      setCursorPosition(Math.max(0, cursorPosition - 1));
      return;
    }

    // Handle right arrow
    if (key.rightArrow) {
      setCursorPosition(Math.min(value.length, cursorPosition + 1));
      return;
    }

    // Handle Home (move to start)
    // Note: key.home might not be defined in all Ink versions, use ctrl+a as fallback
    if ((key as { home?: boolean }).home || (key.ctrl && input === 'a')) {
      setCursorPosition(0);
      return;
    }

    // Handle End (move to end)
    // Note: key.end might not be defined in all Ink versions, use ctrl+e as fallback
    if ((key as { end?: boolean }).end || (key.ctrl && input === 'e')) {
      setCursorPosition(value.length);
      return;
    }

    // Handle Ctrl+U (clear line)
    if (key.ctrl && input === 'u') {
      setValue('');
      setCursorPosition(0);
      return;
    }

    // Handle regular character input
    if (!key.ctrl && !key.meta && input.length === 1) {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(cursorPosition + 1);
      return;
    }
  });

  // Build the display value with cursor
  const beforeCursor = value.slice(0, cursorPosition);
  const atCursor = value[cursorPosition] || ' ';
  const afterCursor = value.slice(cursorPosition + 1);

  // Format label based on the selected format
  const formatLabels: Record<OutputFormat, string> = {
    md: 'Markdown',
    json: 'JSON',
    yaml: 'YAML',
    txt: 'Plain Text',
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">● Step 4/4 · Output Filename</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="dim">
          Enter filename (without extension):
        </Text>
      </Box>

      <Box marginBottom={1} marginLeft={2}>
        <Text>
          {beforeCursor}
          <Text inverse>{atCursor}</Text>
          {afterCursor}
          <Text color="dim">.{format}</Text>
        </Text>
      </Box>

      <Box marginBottom={1} marginLeft={2}>
        <Text color="dim">
          Format: <Text color="cyanBright">{formatLabels[format]}</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          <Text color="blueBright">←→</Text> move cursor  <Text color="greenBright">Enter</Text> continue  <Text color="yellowBright">Ctrl+U</Text> clear  <Text color="red">Esc</Text> cancel
        </Text>
      </Box>
    </Box>
  );
};

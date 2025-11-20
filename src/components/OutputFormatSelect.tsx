/**
 * @module components/OutputFormatSelect
 *
 * Output format selection component for interactive mode.
 * Allows users to choose output format (markdown, JSON, YAML, or plain text).
 */

import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { OutputFormat } from '../core/types.js';

interface OutputFormatSelectProps {
  defaultFormat: OutputFormat;
  tokensByFormat: Record<OutputFormat, number>;
  onSubmit: (format: OutputFormat) => void;
  onCancel: () => void;
}

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'md', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'txt', label: 'Plain Text' },
];

export const OutputFormatSelect: React.FC<OutputFormatSelectProps> = ({
  defaultFormat,
  tokensByFormat,
  onSubmit,
  onCancel,
}) => {
  const [format, setFormat] = useState<OutputFormat>(defaultFormat);
  const { exit } = useApp();

  // Calculate token difference from default format
  const currentTokens = tokensByFormat[format] || 0;
  const defaultTokens = tokensByFormat[defaultFormat] || 0;
  const tokenDiff = currentTokens - defaultTokens;

  useInput((input, key) => {
    if (input === 'q' || input === 'Q' || key.escape) {
      onCancel();
      exit();
      return;
    }

    if (key.return) {
      onSubmit(format);
      exit();
      return;
    }

    // Navigate format selection with arrow keys
    if (key.leftArrow) {
      const currentIndex = FORMATS.findIndex(f => f.value === format);
      const newIndex = currentIndex > 0 ? currentIndex - 1 : FORMATS.length - 1;
      setFormat(FORMATS[newIndex]!.value);
      return;
    }

    if (key.rightArrow) {
      const currentIndex = FORMATS.findIndex(f => f.value === format);
      const newIndex = currentIndex < FORMATS.length - 1 ? currentIndex + 1 : 0;
      setFormat(FORMATS[newIndex]!.value);
      return;
    }
  });

  // Format token count with proper commas
  const formatTokenCount = (tokens: number) => {
    return tokens.toLocaleString();
  };

  // Get arrow and color based on token difference
  const getTokenDiffDisplay = () => {
    if (tokenDiff === 0) {
      return <Text color="gray">= {formatTokenCount(currentTokens)} tokens</Text>;
    } else if (tokenDiff > 0) {
      return (
        <Text>
          <Text color="red">↑</Text> {formatTokenCount(currentTokens)} tokens{' '}
          <Text color="red">(+{formatTokenCount(tokenDiff)})</Text>
        </Text>
      );
    } else {
      return (
        <Text>
          <Text color="green">↓</Text> {formatTokenCount(currentTokens)} tokens{' '}
          <Text color="green">({formatTokenCount(tokenDiff)})</Text>
        </Text>
      );
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">● Step 3/4 · Output Format</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="dim">Select output format:</Text>
      </Box>
      <Box marginLeft={2} marginBottom={1}>
        {FORMATS.map((fmt) => (
          <Box key={fmt.value} marginRight={3}>
            {format === fmt.value ? (
              <Text color="cyanBright" bold>[{' '}{fmt.label}{' '}]</Text>
            ) : (
              <Text color="dim">{fmt.label}</Text>
            )}
          </Box>
        ))}
      </Box>

      <Box marginLeft={2} marginBottom={1}>
        {getTokenDiffDisplay()}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          <Text color="blueBright">←→</Text> change format  <Text color="greenBright">Enter</Text> continue  <Text color="red">Esc</Text> cancel
        </Text>
      </Box>
    </Box>
  );
};

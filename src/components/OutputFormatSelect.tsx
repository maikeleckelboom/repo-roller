/**
 * @module components/OutputFormatSelect
 *
 * Output format and filename selection component for interactive mode.
 * Allows users to choose output format and customize the filename.
 */

import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { OutputFormat } from '../core/types.js';

interface OutputFormatSelectProps {
  defaultFilename: string;
  defaultFormat: OutputFormat;
  onSubmit: (values: { filename: string; format: OutputFormat }) => void;
  onCancel: () => void;
}

const FORMATS: Array<{ value: OutputFormat; label: string }> = [
  { value: 'md', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'txt', label: 'Plain Text' },
];

export const OutputFormatSelect: React.FC<OutputFormatSelectProps> = ({
  defaultFilename,
  defaultFormat,
  onSubmit,
  onCancel,
}) => {
  const [format, setFormat] = useState<OutputFormat>(defaultFormat);
  const [filename, setFilename] = useState(defaultFilename);
  const { exit } = useApp();

  // Update filename extension when format changes
  const updateFormatAndFilename = (newFormat: OutputFormat) => {
    setFormat(newFormat);

    // Auto-update extension if filename hasn't been manually edited
    // or if it matches a known format extension
    const currentExt = filename.split('.').pop()?.toLowerCase();
    const isKnownExt = ['md', 'json', 'yaml', 'txt'].includes(currentExt || '');

    if (isKnownExt) {
      // Replace extension
      const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
      setFilename(`${nameWithoutExt}.${newFormat}`);
    }
  };

  useInput((input, key) => {
    if (input === 'q' || input === 'Q' || key.escape) {
      onCancel();
      exit();
      return;
    }

    if (key.return) {
      onSubmit({ filename, format });
      exit();
      return;
    }

    // Navigate format selection with arrow keys
    if (key.leftArrow) {
      const currentIndex = FORMATS.findIndex(f => f.value === format);
      const newIndex = currentIndex > 0 ? currentIndex - 1 : FORMATS.length - 1;
      updateFormatAndFilename(FORMATS[newIndex]!.value);
      return;
    }

    if (key.rightArrow) {
      const currentIndex = FORMATS.findIndex(f => f.value === format);
      const newIndex = currentIndex < FORMATS.length - 1 ? currentIndex + 1 : 0;
      updateFormatAndFilename(FORMATS[newIndex]!.value);
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">● Step 3/3 · Output & Format</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="dim">Output file:</Text>
      </Box>
      <Box marginBottom={1} marginLeft={2}>
        <Text color="greenBright">{filename}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="dim">Format:</Text>
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

      <Box marginTop={1}>
        <Text dimColor>
          <Text color="blueBright">←→</Text> change format  <Text color="greenBright">Enter</Text> continue  <Text color="red">Esc</Text> cancel
        </Text>
      </Box>
    </Box>
  );
};

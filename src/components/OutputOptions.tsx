/**
 * @module components/OutputOptions
 *
 * Interactive output configuration step (Step 2/3).
 *
 * OWNS:
 * - Toggle UI for output options (strip comments, tree, stats)
 * - File selection summary display
 * - Keyboard navigation for option toggling
 *
 * DOES NOT OWN:
 * - File scanning or filtering logic
 * - Actual output generation
 * - Format selection (see OutputFormatSelect)
 */

import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface OutputOptionsProps {
  selectedCount: number;
  totalCount: number;
  hiddenCount: number;
  stripComments: boolean;
  withTree: boolean;
  withStats: boolean;
  onSubmit: (values: { stripComments: boolean; withTree: boolean; withStats: boolean }) => void;
  onReselect: () => void;
}

export const OutputOptions: React.FC<OutputOptionsProps> = ({
  selectedCount,
  totalCount,
  hiddenCount,
  stripComments: initialStripComments,
  withTree: initialWithTree,
  withStats: initialWithStats,
  onSubmit,
  onReselect,
}) => {
  const [cursor, setCursor] = useState(0);
  const [stripComments, setStripComments] = useState(initialStripComments);
  const [withTree, setWithTree] = useState(initialWithTree);
  const [withStats, setWithStats] = useState(initialWithStats);
  const { exit } = useApp();

  const options = [
    { label: 'Strip comments from source files', value: stripComments, setter: setStripComments },
    { label: 'Include directory tree view', value: withTree, setter: setWithTree },
    { label: 'Include statistics section', value: withStats, setter: setWithStats },
  ];

  useInput((input, key) => {
    if (input === 'q' || input === 'Q') {
      exit();
      return;
    }

    if (input === 'r' || input === 'R') {
      onReselect();
      exit();
      return;
    }

    if (key.upArrow) {
      setCursor(Math.max(0, cursor - 1));
      return;
    }

    if (key.downArrow) {
      setCursor(Math.min(options.length - 1, cursor + 1));
      return;
    }

    if (input === ' ' || key.leftArrow || key.rightArrow) {
      const option = options[cursor];
      if (option) {
        option.setter(!option.value);
      }
      return;
    }

    if (key.return) {
      onSubmit({ stripComments, withTree, withStats });
      exit();
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">● Step 2/3 · Output</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="greenBright">✓ </Text>
        <Text color="white" bold>{selectedCount}</Text>
        <Text color="gray"> / </Text>
        <Text color="blueBright">{totalCount}</Text>
        <Text color="gray"> files selected</Text>
        {hiddenCount > 0 && (
          <Text color="yellowBright"> · {hiddenCount} files hidden by filter</Text>
        )}
      </Box>

      <Box marginBottom={1} marginTop={1}>
        <Text dimColor>Configure output options:</Text>
      </Box>

      {options.map((option, index) => (
        <Box key={index} marginLeft={2}>
          <Text color={index === cursor ? 'cyanBright' : 'gray'}>
            {index === cursor ? '❯ ' : '  '}
          </Text>
          <Text color={option.value ? 'greenBright' : 'dim'}>
            {option.value ? '◉' : '○'}
          </Text>
          <Text> {option.label}</Text>
        </Box>
      ))}

      <Box marginTop={2}>
        <Text dimColor>
          <Text color="blueBright">↑↓</Text> navigate  <Text color="blueBright">Space</Text> toggle  <Text color="greenBright">Enter</Text> continue  <Text color="yellowBright">R</Text> reselect files  <Text color="red">Q</Text> quit
        </Text>
      </Box>
    </Box>
  );
};

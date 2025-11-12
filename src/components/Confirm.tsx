import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface ConfirmProps {
  message: string;
  defaultValue?: boolean;
  onSubmit: (value: boolean) => void;
}

export const Confirm: React.FC<ConfirmProps> = ({ message, defaultValue = true, onSubmit }) => {
  const [value, setValue] = useState<boolean>(defaultValue);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
      exit();
    } else if (input === 'y' || input === 'Y') {
      setValue(true);
    } else if (input === 'n' || input === 'N') {
      setValue(false);
    } else if (key.leftArrow || key.rightArrow) {
      setValue(!value);
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>
          {message} {' '}
          <Text color={value ? 'green' : 'dim'}>
            {value ? '(Y/n)' : '(y/N)'}
          </Text>
        </Text>
      </Box>
      <Box>
        <Text dimColor>
          Press Y/N to toggle, Enter to confirm
        </Text>
      </Box>
    </Box>
  );
};

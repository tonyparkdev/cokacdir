import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { defaultTheme } from '../themes/classic-blue.js';

interface InputDialogProps {
  title: string;
  prompt: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export default function InputDialog({
  title,
  prompt,
  defaultValue = '',
  onSubmit,
  onCancel,
}: InputDialogProps) {
  const theme = defaultTheme;
  const [value, setValue] = useState(defaultValue);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      if (value.trim()) {
        onSubmit(value.trim());
      }
    } else if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setValue(prev => prev + input);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.colors.borderActive}
      paddingX={2}
      paddingY={1}
      marginX={10}
    >
      <Box justifyContent="center">
        <Text bold color={theme.colors.borderActive}>{title}</Text>
      </Box>
      <Text> </Text>
      <Text>{prompt}</Text>
      <Box>
        <Text color={theme.colors.info}>&gt; </Text>
        <Text>{value}</Text>
        <Text color={theme.colors.borderActive}>_</Text>
      </Box>
      <Text> </Text>
      <Text dimColor>[Enter] Confirm  [Esc] Cancel</Text>
    </Box>
  );
}

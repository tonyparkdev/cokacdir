import React from 'react';
import { Box, Text } from 'ink';

interface MainMenuProps {
  selectedIndex: number;
}

const menuItems = [
  { label: '📁 File Manager', value: 'file-manager' },
  { label: '💾 Disk Utilities', value: 'disk-utils' },
  { label: 'ℹ️  System Info', value: 'system-info' },
];

export default function MainMenu({ selectedIndex }: MainMenuProps) {
  return (
    <Box flexDirection="column">
      <Text color="green" bold>Main Menu</Text>
      <Box marginTop={1} flexDirection="column">
        {menuItems.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={item.value}>
              <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                {isSelected ? '❯ ' : '  '}{item.label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

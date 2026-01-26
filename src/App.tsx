import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import DualPanel from './screens/DualPanel.js';
import SystemInfo from './screens/SystemInfo.js';
import DiskUtils from './screens/DiskUtils.js';
import { defaultTheme } from './themes/classic-blue.js';
import { features } from './utils/platform.js';

type Screen = 'dual-panel' | 'system-info' | 'disk-utils';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dual-panel');

  useInput((input, key) => {
    // ESC from sub-screens
    if (key.escape && currentScreen !== 'dual-panel') {
      setCurrentScreen('dual-panel');
    }
  });

  if (currentScreen === 'dual-panel') {
    return <DualPanel />;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={defaultTheme.colors.borderActive}>
          COKACDIR v0.2.0
        </Text>
      </Box>

      {currentScreen === 'system-info' && <SystemInfo />}
      {currentScreen === 'disk-utils' && features.diskUtils && <DiskUtils />}
      {currentScreen === 'disk-utils' && !features.diskUtils && (
        <Box flexDirection="column">
          <Text color="yellow">Disk Utilities is not available on this platform.</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Press ESC to return to file manager</Text>
      </Box>
    </Box>
  );
}

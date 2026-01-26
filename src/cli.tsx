#!/usr/bin/env node
import { render } from 'ink';
import App from './App.js';

const { waitUntilExit } = render(<App />, {
  // Allow running in non-TTY environments for testing
  exitOnCtrlC: true,
});

waitUntilExit().catch(() => {
  process.exit(1);
});

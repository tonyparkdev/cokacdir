import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { defaultTheme } from '../themes/classic-blue.js';
import { executeCommand, isClaudeAvailable, ClaudeSession, ClaudeResponse } from '../services/claude.js';
import { features } from '../utils/platform.js';
import { renderMarkdown } from '../utils/markdownRenderer.js';

interface AICommandModalProps {
  currentPath: string;
  onClose: () => void;
  onExecuteFileOp?: (op: string, args: string[]) => void;
}

interface HistoryItem {
  type: 'user' | 'assistant' | 'error' | 'system';
  content: string;
}

export default function AICommandModal({ currentPath, onClose, onExecuteFileOp }: AICommandModalProps) {
  const theme = defaultTheme;
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([
    { type: 'system', content: `AI Command Ready. Working directory: ${currentPath}` },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [claudeAvailable, setClaudeAvailable] = useState<boolean>(true);

  // Check Claude availability on mount
  useEffect(() => {
    // Check platform compatibility first
    if (!features.ai) {
      setClaudeAvailable(false);
      setHistory([{
        type: 'error',
        content: 'AI features are only available on Linux and macOS.'
      }]);
      return;
    }

    isClaudeAvailable().then(available => {
      if (!available) {
        setClaudeAvailable(false);
        setHistory([{
          type: 'error',
          content: 'Claude CLI not found. Run "which claude" to verify installation.'
        }]);
      }
    });
  }, []);

  useInput((char, key) => {
    if (key.escape) {
      if (isProcessing) {
        setIsProcessing(false);
        setHistory(prev => [...prev, { type: 'system', content: 'Cancelled.' }]);
      } else {
        onClose();
      }
    }
  });

  const handleSubmit = async (value: string) => {
    if (!value.trim() || isProcessing || !claudeAvailable) return;

    const userInput = value.trim();
    setInput('');
    setIsProcessing(true);

    // Add user message to history
    setHistory(prev => [...prev, { type: 'user', content: userInput }]);

    try {
      // Build context-aware prompt
      const contextPrompt = buildContextPrompt(userInput, currentPath);

      const response = await executeCommand(contextPrompt, sessionId, currentPath);

      if (response.success) {
        // Update session ID if provided
        if (response.sessionId) {
          setSessionId(response.sessionId);
        }

        // Add assistant response
        setHistory(prev => [...prev, {
          type: 'assistant',
          content: response.response || 'Command executed.'
        }]);

        // TODO: Check if response suggests file operations
        // parseAndSuggestOps(response.response || '');
      } else {
        setHistory(prev => [...prev, {
          type: 'error',
          content: response.error || 'Unknown error'
        }]);
      }
    } catch (err: unknown) {
      setHistory(prev => [...prev, {
        type: 'error',
        content: `Error: ${err instanceof Error ? err.message : String(err)}`
      }]);
    }

    setIsProcessing(false);
  };

  const buildContextPrompt = (userInput: string, workDir: string): string => {
    return `You are an AI assistant helping with file management in a Norton Commander-style file manager.
Current working directory: ${workDir}

User request: ${userInput}

If the user asks to perform file operations, provide clear instructions.
Keep responses concise and terminal-friendly.`;
  };

  // TODO: Future implementation - Parse response for file operation suggestions
  // const parseAndSuggestOps = (response: string) => {
  //   // Parse response for file operation suggestions
  //   // and call onExecuteFileOp if appropriate
  // };

  // Limit visible history
  const visibleHistory = history.slice(-8);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.colors.borderActive}
      paddingX={1}
      marginX={2}
      marginY={1}
    >
      {/* Title */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={theme.colors.borderActive}>
          AI Command {sessionId ? `(Session: ${sessionId.slice(0, 8)}...)` : '(New Session)'}
        </Text>
      </Box>

      {/* Warning */}
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.colors.warning} bold>
          ⚠ WARNING: AI may execute actions without asking for confirmation.
        </Text>
      </Box>

      {/* History */}
      <Box flexDirection="column" marginBottom={1}>
        {visibleHistory.map((item, idx) => (
          <Box key={idx} marginBottom={0} marginTop={(item.type === 'user' || item.type === 'assistant') && idx > 0 ? 1 : 0}>
            {item.type === 'user' && (
              <Text>
                <Text color={theme.colors.borderActive} bold>{'> '}</Text>
                <Text color={theme.colors.text}>{item.content}</Text>
              </Text>
            )}
            {item.type === 'assistant' && (
              <Box flexDirection="row">
                <Text color={theme.colors.success} bold>{'< '}</Text>
                <Box flexDirection="column" flexGrow={1}>
                  {renderMarkdown(item.content, { terminalWidth: terminalWidth - 6 })}
                </Box>
              </Box>
            )}
            {item.type === 'error' && (
              <Text color={theme.colors.error}>{item.content}</Text>
            )}
            {item.type === 'system' && (
              <Text color={theme.colors.textDim}>{item.content}</Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Input */}
      <Box>
        {isProcessing ? (
          <>
            <Text color={theme.colors.warning}>
              <Spinner type="dots" />
            </Text>
            <Text color={theme.colors.textDim}> Processing... (Esc to cancel)</Text>
          </>
        ) : (
          <>
            <Text color={theme.colors.warning}>{'> '}</Text>
            {claudeAvailable && (
              <TextInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                placeholder="Type a command or question..."
              />
            )}
          </>
        )}
      </Box>

      {/* Help */}
      <Box marginTop={1}>
        <Text color={theme.colors.textDim}>
          [Enter] Send  [Esc] Close  {sessionId && '[Session persists]'}
        </Text>
      </Box>
    </Box>
  );
}


import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { execSync, spawnSync } from 'child_process';
import os from 'os';
import path from 'path';

interface DiskInfo {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usePercent: number;
  mountpoint: string;
}

export default function DiskUtils() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'disks' | 'analyze'>('disks');
  const [analyzePath, setAnalyzePath] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<string>('');
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  // Load disk info
  const disks = useMemo(() => {
    try {
      const platform = os.platform();

      if (platform === 'darwin' || platform === 'linux') {
        // Use spawnSync for better error handling and no shell injection risk
        const result = spawnSync('df', ['-h'], {
          encoding: 'utf-8',
          timeout: 5000,
          stdio: ['ignore', 'pipe', 'ignore']
        });

        if (result.status !== 0 || !result.stdout) {
          console.error('Failed to get disk info');
          return [];
        }

        const lines = result.stdout.trim().split('\n').slice(1);
        const diskInfos: DiskInfo[] = lines
          .map(line => {
            const parts = line.split(/\s+/);
            if (parts.length >= 6) {
              const usePercentStr = parts[4]?.replace('%', '') || '0';
              return {
                filesystem: parts[0] || '',
                size: parts[1] || '',
                used: parts[2] || '',
                available: parts[3] || '',
                usePercent: parseInt(usePercentStr, 10) || 0,
                mountpoint: parts[5] || '',
              };
            }
            return null;
          })
          .filter((d): d is DiskInfo => d !== null)
          .filter(d => !d.filesystem.startsWith('tmpfs') && !d.filesystem.startsWith('devtmpfs'));
        return diskInfos;
      }
      return [];
    } catch (error) {
      console.error('Error loading disk info:', error);
      return [];
    }
  }, []);

  const selectedDisk = disks[selectedIndex];

  // Handle input
  useInput((input, key) => {
    if (mode === 'disks') {
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex(prev => Math.min(disks.length - 1, prev + 1));
      } else if (key.return && selectedDisk) {
        setAnalyzePath(selectedDisk.mountpoint);
        setMode('analyze');
      }
    } else if (mode === 'analyze' && key.escape) {
      setMode('disks');
      setAnalyzePath(null);
    }
  });

  // Validate path to prevent command injection
  const isValidPath = (pathToCheck: string): boolean => {
    try {
      // Resolve to absolute path and check if it exists
      const resolved = path.resolve(pathToCheck);
      // Check for null bytes and other dangerous characters
      if (resolved.includes('\0') || resolved.includes('\n')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // Analyze directory when analyzePath changes
  useEffect(() => {
    if (analyzePath && mode === 'analyze') {
      setAnalyzeLoading(true);
      setAnalyzeResult('');

      setTimeout(() => {
        try {
          // Validate path before using
          if (!isValidPath(analyzePath)) {
            setAnalyzeResult('Invalid path');
            setAnalyzeLoading(false);
            return;
          }

          // Use spawnSync with array args instead of shell interpolation
          const result = spawnSync('du', ['-sh', analyzePath], {
            encoding: 'utf-8',
            timeout: 30000,
            stdio: ['ignore', 'pipe', 'ignore']
          });

          if (result.status === 0 && result.stdout) {
            const size = result.stdout.split('\t')[0] || 'Unknown';
            setAnalyzeResult(size);
          } else {
            setAnalyzeResult('Error calculating size');
          }
        } catch {
          setAnalyzeResult('Error calculating size');
        }
        setAnalyzeLoading(false);
      }, 100);
    }
  }, [analyzePath, mode]);

  const getUsageColor = (percent: number): string => {
    if (percent >= 90) return 'red';
    if (percent >= 70) return 'yellow';
    return 'green';
  };

  if (mode === 'analyze' && analyzePath) {
    return (
      <Box flexDirection="column">
        <Text color="green" bold>Directory Analysis</Text>
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          <Box>
            <Box width={15}><Text color="cyan">Path:</Text></Box>
            <Text>{analyzePath}</Text>
          </Box>
          <Box>
            <Box width={15}><Text color="cyan">Total Size:</Text></Box>
            {analyzeLoading ? (
              <Text color="yellow">Calculating...</Text>
            ) : (
              <Text bold>{analyzeResult}</Text>
            )}
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press ESC to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="green" bold>Disk Utilities</Text>

      <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Box width={20}><Text bold color="cyan">Filesystem</Text></Box>
          <Box width={10}><Text bold color="cyan">Size</Text></Box>
          <Box width={10}><Text bold color="cyan">Used</Text></Box>
          <Box width={10}><Text bold color="cyan">Avail</Text></Box>
          <Box width={8}><Text bold color="cyan">Use%</Text></Box>
          <Box><Text bold color="cyan">Mount</Text></Box>
        </Box>

        {disks.map((disk, index) => {
          const isSelected = index === selectedIndex;
          const barLength = Math.round(disk.usePercent / 10);
          return (
            <Box key={disk.mountpoint}>
              <Box width={20}>
                <Text inverse={isSelected} bold={isSelected}>
                  {disk.filesystem.length > 18 ? disk.filesystem.substring(0, 15) + '...' : disk.filesystem}
                </Text>
              </Box>
              <Box width={10}><Text>{disk.size}</Text></Box>
              <Box width={10}><Text>{disk.used}</Text></Box>
              <Box width={10}><Text>{disk.available}</Text></Box>
              <Box width={8}>
                <Text color={getUsageColor(disk.usePercent)}>{disk.usePercent}%</Text>
              </Box>
              <Box>
                <Text color={getUsageColor(disk.usePercent)}>
                  {'█'.repeat(barLength)}{'░'.repeat(10 - barLength)}
                </Text>
                <Text> {disk.mountpoint}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>↑↓ Navigate | Enter: Analyze | ESC: Back</Text>
      </Box>
    </Box>
  );
}

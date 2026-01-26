import React, { useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import fs from 'fs';
import path from 'path';
import { formatSize, formatPermissionsShort } from '../utils/format.js';
import type { FileItem, SortBy } from '../types/index.js';

interface FileManagerProps {
  currentPath: string;
  selectedIndex: number;
  showHidden: boolean;
  sortBy: SortBy;
  refreshTrigger: number;
  onNavigate: (path: string) => void;
  onFileCountChange: (count: number) => void;
  onRegisterEnterHandler: (handler: () => void) => void;
}

export default function FileManager({
  currentPath,
  selectedIndex,
  showHidden,
  sortBy,
  refreshTrigger,
  onNavigate,
  onFileCountChange,
  onRegisterEnterHandler,
}: FileManagerProps) {
  // Read and process files
  const { files, error } = useMemo(() => {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      const fileItems: FileItem[] = entries
        .filter(entry => showHidden || !entry.name.startsWith('.'))
        .map((entry) => {
          const fullPath = path.join(currentPath, entry.name);
          let stats = { size: 0, mtime: new Date(), mode: 0 };
          try {
            stats = fs.statSync(fullPath);
          } catch {
            // ignore stat errors
          }
          return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
            permissions: formatPermissionsShort(stats.mode),
          };
        });

      // Sort
      fileItems.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        switch (sortBy) {
          case 'size': return b.size - a.size;
          case 'modified': return b.modified.getTime() - a.modified.getTime();
          default: return a.name.localeCompare(b.name);
        }
      });

      // Add parent directory
      if (currentPath !== '/') {
        fileItems.unshift({
          name: '..',
          isDirectory: true,
          size: 0,
          modified: new Date(),
          permissions: 'drwxr-xr-x',
        });
      }

      return { files: fileItems, error: null };
    } catch (err) {
      return { files: [], error: `Cannot read directory: ${err}` };
    }
  }, [currentPath, showHidden, sortBy, refreshTrigger]);

  // Notify parent of file count changes
  useEffect(() => {
    onFileCountChange(files.length);
  }, [files.length, onFileCountChange]);

  // Clamp selected index
  const clampedIndex = Math.min(selectedIndex, Math.max(0, files.length - 1));
  const selectedFile = files[clampedIndex];

  // Register Enter key handler
  useEffect(() => {
    const handleEnter = () => {
      if (selectedFile?.isDirectory) {
        const newPath = selectedFile.name === '..'
          ? path.dirname(currentPath)
          : path.join(currentPath, selectedFile.name);
        onNavigate(newPath);
      }
    };
    onRegisterEnterHandler(handleEnter);
  }, [selectedFile, currentPath, onNavigate, onRegisterEnterHandler]);

  const visibleCount = 15;
  const startIndex = Math.max(0, Math.min(clampedIndex - Math.floor(visibleCount / 2), Math.max(0, files.length - visibleCount)));
  const visibleFiles = files.slice(startIndex, startIndex + visibleCount);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="yellow">📂 </Text>
        <Text bold>{currentPath}</Text>
        <Text dimColor> | Sort: </Text>
        <Text color={sortBy === 'name' ? 'green' : 'gray'}>[N]ame</Text>
        <Text dimColor> </Text>
        <Text color={sortBy === 'size' ? 'green' : 'gray'}>[S]ize</Text>
        <Text dimColor> </Text>
        <Text color={sortBy === 'modified' ? 'green' : 'gray'}>[M]od</Text>
        <Text dimColor> | Hidden: </Text>
        <Text color={showHidden ? 'green' : 'red'}>{showHidden ? 'ON' : 'OFF'}</Text>
      </Box>

      {error ? (
        <Text color="red">{error}</Text>
      ) : (
        <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          <Box>
            <Box width={30}><Text bold color="cyan">Name</Text></Box>
            <Box width={12}><Text bold color="cyan">Size</Text></Box>
            <Box width={12}><Text bold color="cyan">Perms</Text></Box>
            <Box width={14}><Text bold color="cyan">Modified</Text></Box>
          </Box>
          {visibleFiles.map((file, index) => {
            const actualIndex = startIndex + index;
            const isSelected = actualIndex === clampedIndex;
            const isHiddenFile = file.name.startsWith('.') && file.name !== '..';
            return (
              <Box key={`${actualIndex}-${file.name}`}>
                <Box width={30}>
                  <Text
                    color={file.isDirectory ? 'blue' : isHiddenFile ? 'gray' : 'white'}
                    bold={isSelected}
                    inverse={isSelected}
                  >
                    {file.isDirectory ? '📁 ' : '📄 '}
                    {file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name}
                  </Text>
                </Box>
                <Box width={12}>
                  <Text dimColor={!isSelected}>
                    {file.isDirectory ? '<DIR>' : formatSize(file.size)}
                  </Text>
                </Box>
                <Box width={12}>
                  <Text dimColor color="gray">{file.permissions}</Text>
                </Box>
                <Box width={14}>
                  <Text dimColor={!isSelected}>
                    {file.modified.toLocaleDateString()}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          ↑↓ Navigate | Enter: Open | [H]idden | [R]efresh | [~] Home | ESC: Back | {files.length} items
        </Text>
      </Box>
    </Box>
  );
}

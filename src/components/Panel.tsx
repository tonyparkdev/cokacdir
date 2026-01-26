import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import fs from 'fs';
import path from 'path';
import { defaultTheme } from '../themes/classic-blue.js';
import { formatSize, formatPermissionsShort } from '../utils/format.js';
import type { FileItem } from '../types/index.js';

interface PanelProps {
  currentPath: string;
  isActive: boolean;
  selectedIndex: number;
  selectedFiles: Set<string>;
  width: number;
  height?: number;
  onFilesLoad?: (files: FileItem[]) => void;
}

export default function Panel({
  currentPath,
  isActive,
  selectedIndex,
  selectedFiles,
  width,
  height,
  onFilesLoad,
}: PanelProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const theme = defaultTheme;

  // Load files when path changes
  useEffect(() => {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      const fileItems: FileItem[] = entries.map((entry) => {
        const fullPath = path.join(currentPath, entry.name);
        let size = 0;
        let mtime = new Date();
        let permissions = '';
        try {
          const stats = fs.statSync(fullPath);
          size = stats.size;
          mtime = stats.mtime;
          permissions = formatPermissionsShort(stats.mode);
        } catch {
          // ignore
        }
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size,
          modified: mtime,
          permissions,
        };
      });

      // Sort: directories first
      fileItems.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      // Add parent
      if (currentPath !== '/') {
        fileItems.unshift({
          name: '..',
          isDirectory: true,
          size: 0,
          modified: new Date(),
        });
      }

      setFiles(fileItems);
      setError(null);
      onFilesLoad?.(fileItems);
    } catch (err) {
      setError(`Error: ${err}`);
      setFiles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  // Calculate visible rows: height minus borders (2), header (1), column header (1), footer (1) = 5
  const visibleCount = height ? Math.max(5, height - 5) : 15;
  const startIndex = Math.max(0, selectedIndex - Math.floor(visibleCount / 2));
  const visibleFiles = files.slice(startIndex, startIndex + visibleCount);
  const displayPath = currentPath.length > width - 4
    ? '...' + currentPath.slice(-(width - 7))
    : currentPath;

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="single"
      borderColor={isActive ? theme.colors.borderActive : theme.colors.border}
    >
      <Box justifyContent="center">
        <Text color={isActive ? theme.colors.borderActive : theme.colors.text} bold>
          {displayPath}
        </Text>
      </Box>

      <Box width={width - 2}>
        <Text color={theme.colors.textHeader}>
          {' Name'.padEnd(width - 24)}
        </Text>
        <Text color={theme.colors.textHeader}>
          {'Perm'.padEnd(10)}
        </Text>
        <Text color={theme.colors.textHeader}>
          {'Size'.padStart(8)}
        </Text>
      </Box>

      {error ? (
        <Text color={theme.colors.error}>{error}</Text>
      ) : (
        visibleFiles.map((file, index) => {
          const actualIndex = startIndex + index;
          const isCursor = actualIndex === selectedIndex;
          const isMarked = selectedFiles.has(file.name);

          return (
            <Box
              key={`${currentPath}-${actualIndex}-${file.name}`}
              width={width - 2}
            >
              <Text
                color={isCursor && isActive ? theme.colors.textSelected :
                       isMarked ? theme.colors.warning :
                       file.isDirectory ? theme.colors.textDirectory : theme.colors.text}
                backgroundColor={isCursor && isActive ? theme.colors.bgSelected : undefined}
                bold={file.isDirectory}
              >
                {isMarked ? '*' : ' '}
                {file.isDirectory ? theme.chars.folder : theme.chars.file}
                {(file.name.slice(0, width - 28) + ' '.repeat(width - 28)).slice(0, width - 28)}
              </Text>
              <Text
                color={isCursor && isActive ? theme.colors.textSelected : theme.colors.textDim}
                backgroundColor={isCursor && isActive ? theme.colors.bgSelected : undefined}
              >
                {(file.permissions || '---------').padEnd(10)}
              </Text>
              <Text
                color={isCursor && isActive ? theme.colors.textSelected : theme.colors.textDim}
                backgroundColor={isCursor && isActive ? theme.colors.bgSelected : undefined}
              >
                {(file.isDirectory ? '<DIR>' : formatSize(file.size)).padStart(8)}
              </Text>
            </Box>
          );
        })
      )}

      {Array.from({ length: Math.max(0, visibleCount - visibleFiles.length) }).map((_, i) => (
        <Box key={`empty-${i}`}>
          <Text> </Text>
        </Box>
      ))}

      <Box justifyContent="center">
        <Text color={theme.colors.textDim}>
          {files.filter(f => f.name !== '..').length} files
        </Text>
      </Box>
    </Box>
  );
}

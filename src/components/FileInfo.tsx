import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'fs';
import path from 'path';
import { defaultTheme } from '../themes/classic-blue.js';
import { formatSize, formatDate, formatPermissions } from '../utils/format.js';
import type { FileDetails } from '../types/index.js';

interface FileInfoProps {
  filePath: string;
  onClose: () => void;
}

export default function FileInfo({ filePath, onClose }: FileInfoProps) {
  const theme = defaultTheme;
  const [info, setInfo] = useState<FileDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stats = fs.statSync(filePath);
      const details: FileDetails = {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isSymlink: stats.isSymbolicLink(),
        permissions: formatPermissions(stats.mode),
        owner: stats.uid,
        group: stats.gid,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        inode: stats.ino,
        links: stats.nlink,
      };

      if (stats.isDirectory()) {
        try {
          const entries = fs.readdirSync(filePath);
          details.itemCount = entries.length;
          details.totalSize = calculateDirSize(filePath);
        } catch {
          details.itemCount = 0;
        }
      }

      setInfo(details);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [filePath]);

  useInput((input, key) => {
    if (key.escape || input === 'q' || input === 'Q' || key.return) {
      onClose();
    }
  });

  if (error) {
    return (
      <Box flexDirection="column" borderStyle="double" borderColor={theme.colors.error} padding={1} marginX={4}>
        <Text color={theme.colors.error}>Error: {error}</Text>
        <Text color={theme.colors.textDim}>Press any key to close</Text>
      </Box>
    );
  }

  if (!info) {
    return (
      <Box borderStyle="double" borderColor={theme.colors.borderActive} padding={1} marginX={4}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={theme.colors.borderActive} paddingX={2} paddingY={1} marginX={4}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={theme.colors.borderActive}>File Information</Text>
      </Box>

      <InfoRow label="Name" value={info.name} theme={theme} />
      <InfoRow label="Path" value={info.path} theme={theme} />
      <InfoRow label="Type" value={info.isDirectory ? 'Directory' : info.isSymlink ? 'Symbolic Link' : 'File'} theme={theme} />
      <InfoRow label="Size" value={formatSize(info.size)} theme={theme} />

      {info.isDirectory && info.totalSize !== undefined && (
        <InfoRow label="Total Size" value={formatSize(info.totalSize)} theme={theme} />
      )}
      {info.isDirectory && info.itemCount !== undefined && (
        <InfoRow label="Items" value={String(info.itemCount)} theme={theme} />
      )}

      <Text> </Text>
      <InfoRow label="Permissions" value={info.permissions} theme={theme} />
      <InfoRow label="Owner/Group" value={`${info.owner}/${info.group}`} theme={theme} />
      <InfoRow label="Links" value={String(info.links)} theme={theme} />
      <InfoRow label="Inode" value={String(info.inode)} theme={theme} />

      <Text> </Text>
      <InfoRow label="Created" value={formatDate(info.created)} theme={theme} />
      <InfoRow label="Modified" value={formatDate(info.modified)} theme={theme} />
      <InfoRow label="Accessed" value={formatDate(info.accessed)} theme={theme} />

      <Text> </Text>
      <Text dimColor>Press any key to close</Text>
    </Box>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: { colors: { textDim: string; text: string } } }) {
  return (
    <Box>
      <Text color={theme.colors.textDim}>{label.padEnd(12)}</Text>
      <Text color={theme.colors.text}>{value}</Text>
    </Box>
  );
}

function calculateDirSize(dirPath: string, depth: number = 0, visitedPaths: Set<string> = new Set()): number {
  // SECURITY FIX: Prevent stack overflow with depth limit
  const MAX_DEPTH = 10;

  if (depth > MAX_DEPTH) {
    return 0;
  }

  // SECURITY FIX: Prevent infinite loops from circular symlinks
  try {
    const realPath = fs.realpathSync(dirPath);
    if (visitedPaths.has(realPath)) {
      return 0;
    }
    visitedPaths.add(realPath);
  } catch {
    return 0;
  }

  let size = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          size += calculateDirSize(fullPath, depth + 1, visitedPaths);
        } else {
          size += fs.statSync(fullPath).size;
        }
      } catch {
        // Skip inaccessible files
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return size;
}

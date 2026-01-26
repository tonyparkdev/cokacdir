import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import os from 'os';

interface SystemData {
  hostname: string;
  platform: string;
  arch: string;
  release: string;
  uptime: number;
  totalMem: number;
  freeMem: number;
  cpus: os.CpuInfo[];
  loadavg: number[];
  userInfo: os.UserInfo<string>;
}

export default function SystemInfo() {
  const [data, setData] = useState<SystemData | null>(null);

  useEffect(() => {
    const loadData = () => {
      setData({
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        cpus: os.cpus(),
        loadavg: os.loadavg(),
        userInfo: os.userInfo(),
      });
    };
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  if (!data) {
    return <Text>Loading...</Text>;
  }

  const memUsed = data.totalMem - data.freeMem;
  const memPercent = ((memUsed / data.totalMem) * 100).toFixed(1);

  return (
    <Box flexDirection="column">
      <Text color="green" bold>System Information</Text>

      <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Box width={20}><Text color="cyan">Hostname:</Text></Box>
          <Text>{data.hostname}</Text>
        </Box>
        <Box>
          <Box width={20}><Text color="cyan">User:</Text></Box>
          <Text>{data.userInfo.username}</Text>
        </Box>
        <Box>
          <Box width={20}><Text color="cyan">Platform:</Text></Box>
          <Text>{data.platform} ({data.arch})</Text>
        </Box>
        <Box>
          <Box width={20}><Text color="cyan">Kernel:</Text></Box>
          <Text>{data.release}</Text>
        </Box>
        <Box>
          <Box width={20}><Text color="cyan">Uptime:</Text></Box>
          <Text>{formatUptime(data.uptime)}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="green" bold>Memory</Text>
      </Box>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Box width={20}><Text color="cyan">Total:</Text></Box>
          <Text>{formatBytes(data.totalMem)}</Text>
        </Box>
        <Box>
          <Box width={20}><Text color="cyan">Used:</Text></Box>
          <Text>{formatBytes(memUsed)} ({memPercent}%)</Text>
        </Box>
        <Box>
          <Box width={20}><Text color="cyan">Free:</Text></Box>
          <Text>{formatBytes(data.freeMem)}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="cyan">[</Text>
          <Text color="green">{'█'.repeat(Math.round(parseFloat(memPercent) / 5))}</Text>
          <Text color="gray">{'░'.repeat(20 - Math.round(parseFloat(memPercent) / 5))}</Text>
          <Text color="cyan">]</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="green" bold>CPU ({data.cpus.length} cores)</Text>
      </Box>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Box width={20}><Text color="cyan">Model:</Text></Box>
          <Text>{data.cpus[0]?.model || 'Unknown'}</Text>
        </Box>
        <Box>
          <Box width={20}><Text color="cyan">Speed:</Text></Box>
          <Text>{data.cpus[0]?.speed || 0} MHz</Text>
        </Box>
        <Box>
          <Box width={20}><Text color="cyan">Load (1/5/15m):</Text></Box>
          <Text>{data.loadavg.map(l => l.toFixed(2)).join(' / ')}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Data refreshes every 2s</Text>
      </Box>
    </Box>
  );
}

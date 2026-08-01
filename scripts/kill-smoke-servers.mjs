#!/usr/bin/env node
/**
 * Free ports used by insomnia-smoke-test (4010 HTTP, 4020 Socket.IO).
 */
import { spawnSync } from 'node:child_process';

const ports = [4010, 4020];

for (const port of ports) {
  const result = spawnSync('lsof', ['-ti', `:${port}`], { encoding: 'utf8' });

  if (result.status !== 0 || !result.stdout.trim()) {
    continue;
  }

  for (const pid of result.stdout.trim().split('\n')) {
    try {
      process.kill(Number(pid), 'SIGKILL');
      console.log(`Killed PID ${pid} on port ${port}`);
    } catch {}
  }
}

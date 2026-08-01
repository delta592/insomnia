#!/usr/bin/env node
/**
 * npm ci can skip platform optional dependencies (npm/cli#4828). Re-resolve them
 * so native bindings like @tailwindcss/oxide-* and esbuild are present on CI runners.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { spawnNpm } from './spawn-cli.mjs';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const result = spawnNpm(['install', '--include=optional', '--no-audit', '--no-fund', '--prefer-offline'], {
  cwd: repoRoot,
  repoRoot,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

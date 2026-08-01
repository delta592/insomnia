#!/usr/bin/env node
/**
 * Run insomnia-inso bundle/binary tests against the local smoke-test server.
 * Starts the server, waits for readiness with a timeout, runs tests, then tears down.
 *
 * Usage: node scripts/run-inso-smoke-tests.mjs <bundle|binary>
 */
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const smokeUrl = 'http://localhost:4010';
const readyTimeoutMs = 30_000;
const pollIntervalMs = 250;

const mode = process.argv[2];

if (!['bundle', 'binary'].includes(mode)) {
  console.error('Usage: node scripts/run-inso-smoke-tests.mjs <bundle|binary>');
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function waitForSmokeServer() {
  const deadline = Date.now() + readyTimeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(smokeUrl, { signal: AbortSignal.timeout(2_000) });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {}

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Smoke-test server did not become ready at ${smokeUrl} within ${readyTimeoutMs / 1000}s`);
}

function startSmokeServer() {
  const child = spawn('npm', ['run', 'serve', '-w', 'insomnia-smoke-test'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    detached: true,
  });

  child.stdout.on('data', chunk => process.stdout.write(`[smoke] ${chunk}`));
  child.stderr.on('data', chunk => process.stderr.write(`[smoke] ${chunk}`));

  return child;
}

function killProcessTree(child) {
  if (!child?.pid) {
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {}
  }
}

async function main() {
  run('node', ['scripts/install-libcurl.mjs', 'node']);

  if (mode === 'bundle') {
    run('npm', ['run', 'build', '-w', 'insomnia-inso']);
  } else {
    run('npm', ['run', 'build:production', '-w', 'insomnia-inso']);
    run('npm', ['run', 'package', '-w', 'insomnia-inso']);
  }

  const smokeServer = startSmokeServer();

  try {
    await waitForSmokeServer();
    console.log(`[smoke] Ready at ${smokeUrl}`);

    const testScript = mode === 'bundle' ? 'test:bundle' : 'test:binary';
    run('npm', ['run', testScript, '-w', 'insomnia-inso']);
  } finally {
    killProcessTree(smokeServer);
    run('node', ['scripts/install-libcurl.mjs', 'electron']);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

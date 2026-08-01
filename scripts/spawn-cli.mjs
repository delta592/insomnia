/**
 * Run npm/npx without shell:true (Semgrep spawn-shell-true).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function spawnCliEntry(cliName, args, { cwd, repoRoot, env = process.env }) {
  const cliPath = path.join(repoRoot, 'node_modules/npm/bin', `${cliName}-cli.js`);
  if (fs.existsSync(cliPath)) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      stdio: 'inherit',
      env,
      shell: false,
    });
  }

  const executable = process.platform === 'win32' ? `${cliName}.cmd` : cliName;
  return spawnSync(executable, args, {
    cwd,
    stdio: 'inherit',
    env,
    shell: false,
  });
}

export function spawnNpm(args, { cwd, repoRoot }) {
  return spawnCliEntry('npm', args, { cwd, repoRoot });
}

export function spawnNpx(args, { cwd, repoRoot, env = process.env }) {
  return spawnCliEntry('npx', args, { cwd, repoRoot, env });
}

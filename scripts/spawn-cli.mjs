/**
 * Run npm/npx without shell:true (Semgrep spawn-shell-true).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export function spawnNpm(args, { cwd, repoRoot }) {
  const npmCli = path.join(repoRoot, 'node_modules/npm/bin/npm-cli.js');
  return spawnSync(process.execPath, [npmCli, ...args], {
    cwd,
    stdio: 'inherit',
    shell: false,
  });
}

export function spawnNpx(args, { cwd, repoRoot, env = process.env }) {
  const npxCli = path.join(repoRoot, 'node_modules/npm/bin/npx-cli.js');
  return spawnSync(process.execPath, [npxCli, ...args], {
    cwd,
    stdio: 'inherit',
    env,
    shell: false,
  });
}

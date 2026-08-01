#!/usr/bin/env node
/**
 * Install @getinsomnia/node-libcurl native binding for Node or Electron.
 *
 * 1. Download a prebuilt binary from GitHub releases (fast path).
 * 2. On failure, ensure platform libcurl dev headers exist and compile from source.
 *
 * Usage: node scripts/install-libcurl.mjs <node|electron>
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertRequiredNodeVersion } from './required-node-version.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const libcurlDir = path.join(repoRoot, 'node_modules/@getinsomnia/node-libcurl');
const bindingPath = path.join(libcurlDir, 'lib/binding/node_libcurl.node');

const runtime = process.argv[2];

if (!['node', 'electron'].includes(runtime)) {
  console.error('Usage: node scripts/install-libcurl.mjs <node|electron>');
  process.exit(1);
}

assertRequiredNodeVersion('install-libcurl');

if (!fs.existsSync(libcurlDir)) {
  console.error('@getinsomnia/node-libcurl is not installed. Run npm ci from the repo root first.');
  process.exit(1);
}

function getTargetVersion() {
  if (runtime === 'node') {
    return process.versions.node;
  }

  const insomniaPkgPath = path.join(repoRoot, 'packages/insomnia/package.json');
  const insomniaPkg = JSON.parse(fs.readFileSync(insomniaPkgPath, 'utf8'));
  const electronVersion =
    insomniaPkg.devDependencies?.electron ?? insomniaPkg.dependencies?.electron;

  if (!electronVersion) {
    throw new Error('Could not find electron version in packages/insomnia/package.json');
  }

  return electronVersion;
}

function commandExists(command) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ensureMacOsLibcurl() {
  if (process.platform !== 'darwin') {
    return;
  }

  if (!commandExists('brew')) {
    console.error(
      [
        'Homebrew is required to build node-libcurl from source on macOS.',
        'Install Homebrew: https://brew.sh',
        'Then run: brew install curl pkg-config',
      ].join('\n'),
    );
    process.exit(1);
  }

  try {
    execSync('brew list curl >/dev/null 2>&1');
  } catch {
    console.log('Installing libcurl via Homebrew (needed for node-libcurl source build)...');
    execSync('brew install curl pkg-config', { stdio: 'inherit' });
  }

  const brewPrefix = execSync('brew --prefix', { encoding: 'utf8' }).trim();
  const curlPrefix = execSync('brew --prefix curl', { encoding: 'utf8' }).trim();

  process.env.PKG_CONFIG_PATH = [path.join(curlPrefix, 'lib/pkgconfig'), process.env.PKG_CONFIG_PATH]
    .filter(Boolean)
    .join(':');
  process.env.CPATH = [path.join(curlPrefix, 'include'), process.env.CPATH].filter(Boolean).join(':');
  process.env.LIBRARY_PATH = [path.join(curlPrefix, 'lib'), process.env.LIBRARY_PATH]
    .filter(Boolean)
    .join(':');
  process.env.LDFLAGS = [`-L${path.join(curlPrefix, 'lib')}`, process.env.LDFLAGS]
    .filter(Boolean)
    .join(' ');
  process.env.CPPFLAGS = [`-I${path.join(curlPrefix, 'include')}`, process.env.CPPFLAGS]
    .filter(Boolean)
    .join(' ');
  process.env.PATH = [path.join(brewPrefix, 'bin'), process.env.PATH].filter(Boolean).join(':');
}

function ensureLinuxLibcurl() {
  if (process.platform !== 'linux') {
    return;
  }

  if (commandExists('curl-config')) {
    return;
  }

  if (commandExists('apt-get')) {
    console.log('Installing libcurl development headers via apt-get...');
    execSync(
      'sudo DEBIAN_FRONTEND=noninteractive apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y libcurl4-openssl-dev',
      { stdio: 'inherit' },
    );
    return;
  }

  if (commandExists('dnf')) {
    console.log('Installing libcurl development headers via dnf...');
    execSync('sudo dnf install -y libcurl-devel', { stdio: 'inherit' });
  }
}

function printLinuxHint() {
  if (process.platform !== 'linux') {
    return;
  }

  console.error(
    [
      'Install libcurl development headers, then re-run this script:',
      '  Debian/Ubuntu: sudo apt-get install libcurl4-openssl-dev',
      '  Fedora/RHEL:   sudo dnf install libcurl-devel',
    ].join('\n'),
  );
}

function printWindowsHint() {
  if (process.platform !== 'win32') {
    return;
  }

  console.error(
    'On Windows, install Visual Studio Build Tools: https://github.com/felixrieseberg/windows-build-tools',
  );
}

function runNodePreGyp({ fallbackToBuild = false } = {}) {
  const args = [
    'node-pre-gyp',
    'install',
    '--directory',
    libcurlDir,
    '--update-binary',
    `--runtime=${runtime}`,
  ];

  // node-pre-gyp's abi_crosswalk.json lags new Node majors; omit --target for node so it
  // uses process.versions.modules (e.g. node-v147 on Node 26).
  if (runtime === 'electron') {
    args.push(`--target=${getTargetVersion()}`);
  }

  if (fallbackToBuild) {
    args.push('--fallback-to-build');
  }

  console.log(`> npx ${args.join(' ')}`);

  const result = spawnSync('npx', args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  return result.status === 0;
}

function runNodeGypRebuild() {
  console.log('> npx node-gyp rebuild');
  const result = spawnSync('npx', ['node-gyp', 'rebuild'], {
    cwd: libcurlDir,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

const target = getTargetVersion();
console.log(`Installing node-libcurl for ${runtime}@${target} (${process.platform}/${process.arch})`);

let success = runNodePreGyp();

if (!success) {
  console.log('Prebuilt binary unavailable — ensuring system libcurl and building from source...');
  ensureMacOsLibcurl();
  ensureLinuxLibcurl();
  if (process.platform === 'linux' && !commandExists('curl-config')) {
    printLinuxHint();
  }
  printWindowsHint();
  success = runNodePreGyp({ fallbackToBuild: true });
}

if (!success && runtime === 'node') {
  console.log('node-pre-gyp failed — trying node-gyp rebuild directly...');
  success = runNodeGypRebuild();
}

if (!success || !fs.existsSync(bindingPath)) {
  console.error(`Failed to install node-libcurl for ${runtime}. Expected binary at:\n  ${bindingPath}`);
  process.exit(1);
}

console.log(`node-libcurl ready for ${runtime} at ${bindingPath}`);

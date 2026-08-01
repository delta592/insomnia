#!/usr/bin/env node
/**
 * Read required Node/npm versions from .nvmrc and root package.json engines.
 * Use assertRequiredNodeVersion() in scripts that must run on the pinned runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function getRequiredNodeVersion() {
  return fs.readFileSync(path.join(repoRoot, '.nvmrc'), 'utf8').trim();
}

export function getRequiredNpmVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  return pkg.engines.npm;
}

export function parseNodeVersion(version) {
  const normalized = version.startsWith('v') ? version.slice(1) : version;
  const [major, minor, patch] = normalized.split('.').map(Number);

  if ([major, minor, patch].some(Number.isNaN)) {
    throw new Error(`Invalid Node version: ${version}`);
  }

  return { major, minor, patch };
}

export function assertRequiredNodeVersion(context = 'insomnia') {
  const required = getRequiredNodeVersion();
  const expected = parseNodeVersion(required);
  const runtime = parseNodeVersion(process.version);

  if (runtime.major !== expected.major || runtime.minor !== expected.minor) {
    console.error(
      `[${context}] Node v${required} is required (see .nvmrc); got ${process.version}`,
    );
    process.exit(1);
  }

  if (runtime.patch !== expected.patch) {
    console.warn(
      `[${context}] Node v${required} is recommended (see .nvmrc); got ${process.version}`,
    );
  }
}

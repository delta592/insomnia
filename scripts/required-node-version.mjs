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

export function assertRequiredNodeVersion(context = 'insomnia') {
  const required = getRequiredNodeVersion();
  const expected = `v${required}`;

  if (process.version !== expected) {
    console.error(`[${context}] Node ${expected} is required (see .nvmrc); got ${process.version}`);
    process.exit(1);
  }
}

// ─── CGRF Header ──────────────────────────────
// File:         .github/scripts/package-provenance.mjs
// Stage:        11_COMMIT
// SRS:          SRS-CN-WRITERS-BUILD-001
// CAPS:         pending
// CK:           pending
// Dispatch:     DISP-BUILD-writers
// Seat:         BITS-CODEGEN
// Owner:        Citadel Nexus Inc.
// Created:      2026-10-20
// Depends:      tsconfig.build.json
// EnumType:     Workflow
// EnumEdges:    CONSUMES tsconfig.build.json
// DAG Node:     none
// Intent:       Reject incomplete or unexpected compiler output before provenance packaging.
// ──────────────────────────────────────────────

import { lstatSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Reject missing, empty, linked or unexpected output before creating an archive. */
export function validateBuild(root = '.') {
  const dist = join(root, 'dist');
  function walk(directory) {
    if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) {
      throw new Error(`Invalid build directory: ${directory}`);
    }
    const entries = readdirSync(directory);
    if (entries.length === 0) throw new Error(`Empty build directory: ${directory}`);
    for (const name of entries) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`Linked build output: ${path}`);
      if (stat.isDirectory()) {
        if (['test', 'tests', 'node_modules', 'coverage'].includes(name)) {
          throw new Error(`Non-runtime directory: ${path}`);
        }
        walk(path);
      } else if (!stat.isFile() || stat.size === 0 ||
                 !/\.(js|d\.ts)$/.test(name) || /\.(test|spec)\./.test(name)) {
        throw new Error(`Invalid runtime output: ${path}`);
      }
    }
  }
  walk(dist);
  if (readdirSync(dist).join() !== 'src') throw new Error('Expected only dist/src');
  for (const entry of ['index.js', 'server.js']) {
    if (!lstatSync(join(dist, 'src', entry)).isFile()) throw new Error(`Missing ${entry}`);
  }
}

/** Package the validated compiler output, without source, dependencies or fixtures. */
export function packageBuild(root = '.') {
  validateBuild(root);
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  execFileSync('tar', ['-czf', 'artifacts/writers-build.tar.gz', 'dist'], { cwd: root });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  packageBuild();
}

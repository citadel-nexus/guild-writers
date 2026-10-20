// ─── CGRF Header ──────────────────────────────
// File:         test/build-provenance.check.mjs
// Stage:        08_TEST
// SRS:          SRS-CN-WRITERS-BUILD-001
// CAPS:         pending
// CK:           pending
// Dispatch:     DISP-BUILD-writers
// Seat:         BITS-CODEGEN
// Owner:        Citadel Nexus Inc.
// Created:      2026-10-20
// Depends:      .github/scripts/package-provenance.mjs, .github/scripts/verify-provenance.sh, tsconfig.build.json
// EnumType:     Test
// EnumEdges:    VALIDATES .github/scripts/package-provenance.mjs; VALIDATES .github/scripts/verify-provenance.sh; VALIDATES tsconfig.build.json
// DAG Node:     none
// Intent:       Exercise packaging rejection and signer verification gates offline without claiming cryptographic validation.
// ──────────────────────────────────────────────

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { packageBuild, validateBuild } from '../.github/scripts/package-provenance.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'writers-build-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'dist/src'), { recursive: true });
  for (const file of ['index.js', 'server.js', 'index.d.ts']) {
    writeFileSync(join(root, 'dist/src', file), 'export {};\n');
  }
  return root;
}

test('packages only validated runtime output', (t) => {
  const root = fixture(t);
  packageBuild(root);
  const tar = spawnSync('tar', ['-tzf', join(root, 'artifacts/writers-build.tar.gz')], { encoding: 'utf8' });
  assert.equal(tar.status, 0);
  assert.match(tar.stdout, /dist\/src\/index\.js/);
  assert.doesNotMatch(tar.stdout, /package.json|node_modules/);
});

for (const [name, mutate] of [
  ['missing build', (root) => rmSync(join(root, 'dist'), { recursive: true })],
  ['missing entrypoint', (root) => rmSync(join(root, 'dist/src/index.js'))],
  ['empty entrypoint', (root) => writeFileSync(join(root, 'dist/src/index.js'), '')],
  ['test output', (root) => writeFileSync(join(root, 'dist/src/runtime.test.js'), 'test')],
  ['source file', (root) => writeFileSync(join(root, 'dist/src/runtime.ts'), 'source')],
  ['dependency directory', (root) => mkdirSync(join(root, 'dist/src/node_modules'))],
  ['unexpected root', (root) => writeFileSync(join(root, 'dist/config.js'), 'config')],
  ['linked output', (root) => symlinkSync('/etc/hosts', join(root, 'dist/src/link.js'))],
  ['linked dist', (root) => {
    rmSync(join(root, 'dist'), { recursive: true });
    symlinkSync('/tmp', join(root, 'dist'));
  }],
]) {
  test(`rejects ${name} before packaging`, (t) => {
    const root = fixture(t);
    mutate(root);
    assert.throws(() => validateBuild(root));
    assert.throws(() => packageBuild(root));
  });
}

function verify(t, mode = 'enforce') {
  const root = fixture(t);
  const artifact = join(root, 'artifact.tar.gz');
  const bundle = join(root, 'bundle.json');
  const log = join(root, 'calls');
  writeFileSync(artifact, 'original artifact');
  writeFileSync(bundle, '{}');
  writeFileSync(join(root, 'gh'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify(args) + '\\n');
if (process.env.MOCK_MODE === 'unavailable') process.exit(1);
if (process.env.MOCK_MODE === 'accept-all') process.exit(0);
const invalid = fs.readFileSync(args[2], 'utf8').includes('intentional-tamper') ||
  args.includes('https://github.com/citadel-nexus/guild-writers/.github/workflows/untrusted.yml@refs/heads/main');
if (process.env.MOCK_MODE === 'accept-wrong-signer') {
  process.exit(fs.readFileSync(args[2], 'utf8').includes('intentional-tamper') ? 1 : 0);
}
process.exit(invalid ? 1 : 0);
`, { mode: 0o700 });
  const result = spawnSync('bash', [resolve('.github/scripts/verify-provenance.sh'), artifact, bundle], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${root}:${process.env.PATH}`, GITHUB_REPOSITORY: 'citadel-nexus/guild-writers',
      GITHUB_SHA: 'a'.repeat(40), CALL_LOG: log, MOCK_MODE: mode },
  });
  return { result, calls: readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse), bundle };
}

test('verification runs positive controls and both negative cases against the same bundle', (t) => {
  const { result, calls, bundle } = verify(t);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls.length, 4);
  for (const args of calls) {
    assert.equal(args[args.indexOf('--bundle') + 1], bundle);
    assert.equal(args[args.indexOf('--source-ref') + 1], 'refs/heads/main');
    assert.equal(args[args.indexOf('--source-digest') + 1], 'a'.repeat(40));
    assert.equal(args[args.indexOf('--signer-digest') + 1], 'a'.repeat(40));
    assert.equal(args[args.indexOf('--repo') + 1], 'citadel-nexus/guild-writers');
    assert.ok(args.includes('--deny-self-hosted-runners'));
  }
  assert.deepEqual(calls[0], calls[3]);
  assert.notEqual(calls[0][2], calls[1][2]);
  assert.match(calls[2].at(-1), /untrusted\.yml@refs\/heads\/main$/);
});
for (const mode of ['unavailable', 'accept-all', 'accept-wrong-signer']) {
  test(`verification gate fails when verifier is ${mode}`, (t) => {
    const { result } = verify(t, mode);
    assert.notEqual(result.status, 0);
  });
}

test('build emits service code while checking tests separately', () => {
  const config = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
  const build = JSON.parse(readFileSync('tsconfig.build.json', 'utf8'));
  assert.equal(config.compilerOptions.noEmit, true);
  assert.ok(config.include.includes('test/**/*.ts'));
  assert.equal(build.compilerOptions.noEmit, false);
  assert.equal(build.compilerOptions.noEmitOnError, true);
  assert.equal(build.extends, './tsconfig.json');
  assert.ok(build.exclude.includes('test'));
  assert.ok(build.include.every((path) => path.startsWith('src/')));
});

test('state retains fractional activity and quiet fallback with the native TS runtime', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { registerHooks } from 'node:module';
    registerHooks({ resolve(specifier, context, nextResolve) {
      if (context.parentURL?.includes('/src/') && specifier.endsWith('.js')) {
        return nextResolve(specifier.slice(0, -3) + '.ts', context);
      }
      return nextResolve(specifier, context);
    } });
    const { LivingWorldState } = await import('./src/livingworld/state.ts');
    const state = new LivingWorldState();
    assert.equal(state.updateActivity(0.72), 0.72);
    assert.equal(state.realmFeed().activity_level, 0.72);
    assert.equal(state.updateActivity(undefined), 0);
    assert.equal(state.updateActivity(2), 1);
    assert.equal(state.updateActivity(-1), 0);
  `], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

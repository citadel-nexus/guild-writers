// ─── CGRF Header ───────────────────────────────────────────────
// File:        eslint.config.mjs
// Stage:       11_COMMIT
// SRS:         SRS-CN-WRITERS-BUILD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-BUILD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-10-20
// Depends:     tsconfig.json, package.json
// EnumType:    ConfigDoc
// EnumEdges:   DEPENDS_ON tsconfig.json; DEPENDS_ON package.json
// DAG Node:    none
// Intent:      Lint the existing checked TypeScript surface independently of compilation.
// ───────────────────────────────────────────────────────────────

import project from './tsconfig.json' with { type: 'json' };
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Match the established typecheck surface. The unreferenced legacy NATS/CML
// prototypes are outside that surface and are not promoted into the build here.
export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  { ...js.configs.recommended, files: project.include },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: project.include,
  })),
  {
    files: project.include,
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];

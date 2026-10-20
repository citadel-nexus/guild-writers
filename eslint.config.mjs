// ─── CGRF Header ──────────────────────────────
// File:         eslint.config.mjs
// Stage:        11_COMMIT
// SRS:          SRS-CN-WRITERS-BUILD-001
// CAPS:         pending
// CK:           pending
// Dispatch:     DISP-BUILD-writers
// Seat:         BITS-CODEGEN
// Owner:        Citadel Nexus Inc.
// Created:      2026-10-20
// Depends:      src/livingworld/state.ts, package.json
// EnumType:     ConfigDoc
// EnumEdges:    VALIDATES src/livingworld/state.ts; DEPENDS_ON package.json
// DAG Node:     none
// Intent:       Make the Writers build reproducible and verifiable before staging review.
// ──────────────────────────────────────────────

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**', 'coverage/**', 'node_modules/**',
      // Unused legacy stubs are already outside the TypeScript build graph.
      'src/automation/cml-bridge.ts', 'src/automation/nats-listener.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Quest titles deliberately strip control characters before public output.
      'no-control-regex': 'off',
    },
  },
);

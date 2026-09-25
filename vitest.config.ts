// ─── CGRF Header ──────────────────────────────
// File:        vitest.config.ts
// Stage:       08_TEST
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     package.json, tsconfig.json
// EnumType:    ConfigDoc
// EnumEdges:   VALIDATES src/livingworld/state.ts; VALIDATES src/automation/livingworld-emitter.ts
// DAG Node:    writers.test.config
// Intent:      Enforce repeatable living-world tests and minimum coverage for new public contracts.
// ──────────────────────────────────────────────

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: [
        'src/automation/livingworld-emitter.ts',
        'src/livingworld/**/*.ts',
        'src/routes/**/*.ts',
        'src/server.ts',
        'src/telemetry/**/*.ts',
      ],
      exclude: ['src/index.ts'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});

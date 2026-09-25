// ─── CGRF Header ──────────────────────────────
// File:        test/progression.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/livingworld/progression.ts, src/livingworld/state.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/livingworld/progression.ts; VALIDATES src/livingworld/state.ts
// DAG Node:    writers.test.progression
// Intent:      Prove structures advance only when every documented real-metric threshold is met.
// ────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  normalizeProgressionMetrics,
  structureLevelFor,
} from '../src/livingworld/progression.js';
import { LivingWorldState } from '../src/livingworld/state.js';

describe('floor progression', () => {
  it.each([
    [{}, 1],
    [{ loreEntriesPublished: 25, questsCompleted: 10, championUptimePercent: 95 }, 2],
    [{ loreEntriesPublished: 100, questsCompleted: 50, championUptimePercent: 97 }, 3],
    [{ loreEntriesPublished: 250, questsCompleted: 125, championUptimePercent: 98 }, 4],
    [{ loreEntriesPublished: 500, questsCompleted: 250, championUptimePercent: 99 }, 5],
  ] as const)('maps verified metrics to level %s', (metrics, expected) => {
    expect(structureLevelFor(metrics)).toBe(expected);
  });

  it('requires every metric and normalizes invalid values', () => {
    expect(
      structureLevelFor({
        loreEntriesPublished: 500,
        questsCompleted: 250,
        championUptimePercent: 94,
      }),
    ).toBe(1);
    expect(
      normalizeProgressionMetrics({
        loreEntriesPublished: -4,
        questsCompleted: 2.8,
        championUptimePercent: 140,
      }),
    ).toEqual({
      loreEntriesPublished: 0,
      questsCompleted: 2,
      championUptimePercent: 100,
    });
  });

  it('updates the public structure level from sanitized metrics', () => {
    const state = new LivingWorldState();
    const change = state.updateProgression({
      loreEntriesPublished: 100,
      questsCompleted: 50,
      championUptimePercent: 97,
    });

    expect(change).toEqual({ changed: true, value: 3 });
    expect(state.progressionMetrics()).toEqual({
      loreEntriesPublished: 100,
      questsCompleted: 50,
      championUptimePercent: 97,
    });
    expect(state.realmFeed().structures).toEqual([{ kind: 'hall', level: 3 }]);
  });
});

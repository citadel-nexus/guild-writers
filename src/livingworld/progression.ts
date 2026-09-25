// ─── CGRF Header ──────────────────────────────
// File:        src/livingworld/progression.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     .bits/progression.md
// EnumType:    Service
// EnumEdges:   CONSUMES .bits/progression.md; PRODUCES src/livingworld/state.ts
// DAG Node:    writers.livingworld.progression
// Intent:      Derive structure growth only from verified lore, quest, and champion-uptime metrics.
// ──────────────────────────────────────────────

export type StructureLevel = 1 | 2 | 3 | 4 | 5;

export interface ProgressionMetrics {
  loreEntriesPublished: number;
  questsCompleted: number;
  championUptimePercent: number;
}

interface ProgressionThreshold extends ProgressionMetrics {
  level: StructureLevel;
}

export const PROGRESSION_THRESHOLDS: readonly ProgressionThreshold[] = Object.freeze([
  { level: 2, loreEntriesPublished: 25, questsCompleted: 10, championUptimePercent: 95 },
  { level: 3, loreEntriesPublished: 100, questsCompleted: 50, championUptimePercent: 97 },
  { level: 4, loreEntriesPublished: 250, questsCompleted: 125, championUptimePercent: 98 },
  { level: 5, loreEntriesPublished: 500, questsCompleted: 250, championUptimePercent: 99 },
]);

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function percentage(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0;
}

/** Normalize source metrics before they influence the public floor. */
export function normalizeProgressionMetrics(value: Partial<ProgressionMetrics>): ProgressionMetrics {
  return {
    loreEntriesPublished: nonNegativeInteger(value.loreEntriesPublished),
    questsCompleted: nonNegativeInteger(value.questsCompleted),
    championUptimePercent: percentage(value.championUptimePercent),
  };
}

/** Return the highest structure level for which all real thresholds are satisfied. */
export function structureLevelFor(value: Partial<ProgressionMetrics>): StructureLevel {
  const metrics = normalizeProgressionMetrics(value);
  let level: StructureLevel = 1;
  for (const threshold of PROGRESSION_THRESHOLDS) {
    if (
      metrics.loreEntriesPublished >= threshold.loreEntriesPublished &&
      metrics.questsCompleted >= threshold.questsCompleted &&
      metrics.championUptimePercent >= threshold.championUptimePercent
    ) {
      level = threshold.level;
    }
  }
  return level;
}

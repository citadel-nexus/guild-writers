// ─── CGRF Header ──────────────────────────────
// File:        src/integrations/sources.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/livingworld/state.ts, src/livingworld/progression.ts
// EnumType:    Schema
// EnumEdges:   CONSUMES src/livingworld/state.ts; CONSUMES src/livingworld/progression.ts
// DAG Node:    writers.integration.sources
// Intent:      Limit every private-source adapter to the aggregate signals accepted by public floor state.
// ──────────────────────────────────────────────

import type { ProgressionMetrics } from '../livingworld/progression.js';
import type { QuestChange } from '../livingworld/state.js';

export type SourceName = 'gitlab' | 'supabase' | 'n8n';

export interface SanitizedSourceSnapshot {
  source: SourceName;
  activityLevel: number;
  quests: QuestChange[];
  progression: Partial<ProgressionMetrics>;
  observedAt: string;
}

export interface LivingWorldSource {
  readonly configured: boolean;
  snapshot(): Promise<SanitizedSourceSnapshot>;
}

export function quietSnapshot(source: SourceName, now: () => Date): SanitizedSourceSnapshot {
  return {
    source,
    activityLevel: 0,
    quests: [],
    progression: {},
    observedAt: now().toISOString(),
  };
}

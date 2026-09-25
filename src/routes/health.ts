// ─── CGRF Header ──────────────────────────────
// File:        src/routes/health.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/automation/livingworld-emitter.ts
// EnumType:    Route
// EnumEdges:   CONSUMES src/automation/livingworld-emitter.ts; VALIDATES .bits/agents/quill.yml
// DAG Node:    writers.route.health
// Intent:      Report healthy or quiet service mode without exposing connection details.
// ──────────────────────────────────────────────

export interface HealthFeed {
  guild: 'writers';
  status: 'healthy' | 'degraded';
  mode: 'live' | 'quiet';
  version: '0.1.0';
  nats_prefix: 'citadel.writers.*';
  timestamp: string;
}

/** Return the public health state without connection details. */
export function healthCheck(
  natsAvailable: boolean,
  now: () => Date = () => new Date(),
): HealthFeed {
  return {
    guild: 'writers',
    status: natsAvailable ? 'healthy' : 'degraded',
    mode: natsAvailable ? 'live' : 'quiet',
    version: '0.1.0',
    nats_prefix: 'citadel.writers.*',
    timestamp: now().toISOString(),
  };
}

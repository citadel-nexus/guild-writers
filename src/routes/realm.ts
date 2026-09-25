// ─── CGRF Header ──────────────────────────────
// File:        src/routes/realm.ts
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
// EnumEdges:   CONSUMES src/automation/livingworld-emitter.ts; PRODUCES /realm/writers.json
// DAG Node:    writers.route.realm
// Intent:      Expose the cleansed Writers floor snapshot consumed by the public game.
// ──────────────────────────────────────────────

import type { LivingWorldFloor } from '../automation/livingworld-emitter.js';
import type { WritersRealmFeed } from '../livingworld/contracts.js';

/** Read the public Writers realm feed. */
export function getWritersRealm(floor: LivingWorldFloor): WritersRealmFeed {
  return floor.realmFeed();
}

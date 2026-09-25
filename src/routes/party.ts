// ─── CGRF Header ──────────────────────────────
// File:        src/routes/party.ts
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
// EnumEdges:   CONSUMES src/automation/livingworld-emitter.ts; PRODUCES /game/party.json
// DAG Node:    writers.route.party
// Intent:      Bind Quill as the public Writers floor guildmaster avatar.
// ──────────────────────────────────────────────

import type { LivingWorldFloor } from '../automation/livingworld-emitter.js';
import type { WritersPartyFeed } from '../livingworld/contracts.js';

/** Read Quill's public party binding. */
export function getWritersParty(floor: LivingWorldFloor): WritersPartyFeed {
  return floor.partyFeed();
}

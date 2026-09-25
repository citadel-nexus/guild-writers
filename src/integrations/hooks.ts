// ─── CGRF Header ──────────────────────────────
// File:        src/integrations/hooks.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/automation/livingworld-emitter.ts
// EnumType:    Adapter
// EnumEdges:   CONSUMES src/automation/livingworld-emitter.ts; DEPENDS_ON src/integrations/posthog.ts; DEPENDS_ON src/integrations/customerio.ts
// DAG Node:    writers.integration.hooks
// Intent:      Fan out floor side effects without allowing any integration failure to block core state.
// ──────────────────────────────────────────────

import type {
  FloorHooks,
  LoreCompilationOutcome,
} from '../automation/livingworld-emitter.js';
import type { ChampionState, ClientSurface } from '../livingworld/contracts.js';
import type { QuestChange } from '../livingworld/state.js';

export class CompositeFloorHooks implements FloorHooks {
  constructor(private readonly hooks: readonly FloorHooks[]) {}

  activity(level: number, method: string): void {
    this.run((hook) => hook.activity(level, method));
  }

  quest(change: QuestChange): void {
    this.run((hook) => hook.quest(change));
  }

  champion(previous: ChampionState, next: ChampionState): void {
    this.run((hook) => hook.champion(previous, next));
  }

  loreCompilation(outcome: LoreCompilationOutcome): void {
    this.run((hook) => hook.loreCompilation(outcome));
  }

  engagement(surface: ClientSurface): void {
    this.run((hook) => hook.engagement(surface));
  }

  async close(): Promise<void> {
    await Promise.allSettled(this.hooks.map((hook) => hook.close()));
  }

  private run(callback: (hook: FloorHooks) => void): void {
    for (const hook of this.hooks) {
      try {
        callback(hook);
      } catch (error: unknown) {
        console.warn('writers_integration_hook_failed', {
          error_name: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }
  }
}

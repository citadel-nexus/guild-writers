// ─── CGRF Header ──────────────────────────────
// File:        src/integrations/coordinator.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/gitlab.ts, src/integrations/supabase.ts, src/integrations/posthog.ts, src/integrations/guild-comms.ts
// EnumType:    Service
// EnumEdges:   CONSUMES src/integrations/sources.ts; CONSUMES src/integrations/posthog.ts; PRODUCES src/automation/livingworld-emitter.ts
// DAG Node:    writers.integration.coordinator
// Intent:      Merge sanitized source snapshots into one deterministic floor state with circuit breaking.
// ──────────────────────────────────────────────

import type { LivingWorldFloor } from '../automation/livingworld-emitter.js';
import type { ProgressionMetrics } from '../livingworld/progression.js';
import type { GuildCommsBridge } from './guild-comms.js';
import type { CircuitBreaker } from './posthog.js';
import type { LivingWorldSource, SanitizedSourceSnapshot, SourceName } from './sources.js';
import type { NoopSupabaseBridge, SupabaseLoreBridge } from './supabase.js';

export class IntegrationCoordinator {
  private readonly snapshots = new Map<SourceName, SanitizedSourceSnapshot>();
  private timer: NodeJS.Timeout | undefined;
  private unsubscribeSupabase: (() => Promise<void>) | undefined;

  constructor(
    private readonly floor: LivingWorldFloor,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly gitlab: LivingWorldSource,
    private readonly supabase: SupabaseLoreBridge | NoopSupabaseBridge,
    private readonly guildComms: GuildCommsBridge,
    private readonly pollIntervalMs = 60_000,
  ) {}

  async start(): Promise<void> {
    await this.poll();
    try {
      if (this.supabase.configured && !(await this.circuitBreaker.isOpen('supabase'))) {
        this.unsubscribeSupabase = this.supabase.subscribe((snapshot) => {
          void this.apply(snapshot).catch((error: unknown) => {
            this.warnUnavailable('supabase-realtime', error);
          });
        });
      }
    } catch (error: unknown) {
      this.warnUnavailable('supabase-realtime', error);
    }
    this.timer = setInterval(() => void this.poll(), this.pollIntervalMs);
    this.timer.unref();
  }

  async stop(): Promise<void> {
    if (this.timer !== undefined) clearInterval(this.timer);
    try {
      await this.unsubscribeSupabase?.();
    } catch (error: unknown) {
      this.warnUnavailable('supabase-realtime', error);
    }
  }

  async poll(): Promise<void> {
    const sources: Array<[SourceName, LivingWorldSource]> = [
      ['gitlab', this.gitlab],
      ['supabase', this.supabase],
    ];
    for (const [name, source] of sources) {
      try {
        if (!source.configured || (await this.circuitBreaker.isOpen(name))) continue;
        await this.apply(await source.snapshot());
      } catch (error: unknown) {
        this.warnUnavailable(name, error);
      }
    }
  }

  private async apply(snapshot: SanitizedSourceSnapshot): Promise<void> {
    this.snapshots.set(snapshot.source, snapshot);
    const snapshots = [...this.snapshots.values()];
    const activity = Math.max(0, ...snapshots.map((value) => value.activityLevel));
    await this.floor.heartbeat(activity, 'integration-coordinator');
    for (const quest of snapshots.flatMap((value) => value.quests)) {
      await this.floor.questChanged(quest);
    }

    const current = this.floor.progressionMetrics();
    const progression = snapshots.reduce<ProgressionMetrics>(
      (result, value) => ({
        loreEntriesPublished: Math.max(
          result.loreEntriesPublished,
          value.progression.loreEntriesPublished ?? 0,
        ),
        questsCompleted: Math.max(
          result.questsCompleted,
          value.progression.questsCompleted ?? 0,
        ),
        championUptimePercent: Math.max(
          result.championUptimePercent,
          value.progression.championUptimePercent ?? 0,
        ),
      }),
      current,
    );
    const structureLevel = this.floor.updateProgression(progression);
    const realm = this.floor.realmFeed();
    const party = this.floor.partyFeed();
    await this.guildComms.publishUpwardStatus({
      activity_level: realm.activity_level,
      open_quests: realm.quests.filter((quest) => quest.state === 'open').length,
      champion_state: party.party[0]?.state ?? 'idle',
      structure_level: structureLevel,
    });
  }

  private warnUnavailable(source: string, error: unknown): void {
    console.warn('writers_integration_source_unavailable', {
      source,
      error_name: error instanceof Error ? error.name : 'UnknownError',
    });
  }
}

// ─── CGRF Header ──────────────────────────────
// File:        src/integrations/supabase.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     @supabase/supabase-js, src/integrations/sources.ts
// EnumType:    Adapter
// EnumEdges:   PRODUCES src/integrations/sources.ts
// DAG Node:    writers.integration.supabase
// Intent:      Turn aggregate lore and RPG-session counts into floor signals without reading row payloads.
// ──────────────────────────────────────────────

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

import {
  quietSnapshot,
  type LivingWorldSource,
  type SanitizedSourceSnapshot,
} from './sources.js';

export class SupabaseLoreBridge implements LivingWorldSource {
  readonly configured = true;

  constructor(
    private readonly client: SupabaseClient,
    private readonly activityWindowMinutes = 15,
    private readonly activityCap = 10,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async snapshot(): Promise<SanitizedSourceSnapshot> {
    try {
      const since = new Date(
        this.now().getTime() - this.activityWindowMinutes * 60_000,
      ).toISOString();
      const [loreTotal, sessionsTotal, completedSessions, recentLore, recentSessions] =
        await Promise.all([
          this.count('lore_entries'),
          this.count('rpg_sessions'),
          this.count('rpg_sessions', { status: 'compiled' }),
          this.count('lore_entries', { since }),
          this.count('rpg_sessions', { since }),
        ]);
      const activityLevel = Math.min(1, (recentLore + recentSessions) / this.activityCap);
      return {
        source: 'supabase',
        activityLevel,
        quests: [
          {
            id: 'session-to-lore-pipeline',
            title: 'Session-to-lore pipeline',
            state: completedSessions < sessionsTotal ? 'open' : 'closed',
          },
        ],
        progression: {
          loreEntriesPublished: loreTotal,
          questsCompleted: completedSessions,
        },
        observedAt: this.now().toISOString(),
      };
    } catch (error: unknown) {
      console.warn('writers_supabase_unavailable', {
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
      return quietSnapshot('supabase', this.now);
    }
  }

  /** Refresh aggregate counts on realtime changes without inspecting row payloads. */
  subscribe(onSnapshot: (snapshot: SanitizedSourceSnapshot) => void): () => Promise<void> {
    const channel = this.client
      .channel('writers-lore-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lore_entries' },
        () => void this.refresh(onSnapshot),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rpg_sessions' },
        () => void this.refresh(onSnapshot),
      )
      .subscribe();

    return async () => {
      await this.client.removeChannel(channel as RealtimeChannel);
    };
  }

  private async refresh(onSnapshot: (snapshot: SanitizedSourceSnapshot) => void): Promise<void> {
    onSnapshot(await this.snapshot());
  }

  private async count(
    table: 'lore_entries' | 'rpg_sessions',
    filters: { status?: string; since?: string } = {},
  ): Promise<number> {
    let query = this.client.from(table).select('id', { count: 'exact', head: true });
    if (filters.status !== undefined) {
      query = query.eq('status', filters.status);
    }
    if (filters.since !== undefined) {
      query = query.gte('updated_at', filters.since);
    }
    const result = await query;
    if (result.error !== null) {
      throw new Error('SupabaseCountFailed');
    }
    return result.count ?? 0;
  }
}

export class NoopSupabaseBridge implements LivingWorldSource {
  readonly configured = false;
  constructor(private readonly now: () => Date = () => new Date()) {}
  async snapshot(): Promise<SanitizedSourceSnapshot> {
    return quietSnapshot('supabase', this.now);
  }
  subscribe(_onSnapshot: (snapshot: SanitizedSourceSnapshot) => void): () => Promise<void> {
    return async () => {};
  }
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Create a count-only Supabase bridge when URL and read key are provided at runtime. */
export function createSupabaseLoreBridge(
  environment: NodeJS.ProcessEnv = process.env,
  client?: SupabaseClient,
): SupabaseLoreBridge | NoopSupabaseBridge {
  if (client !== undefined) {
    return new SupabaseLoreBridge(client);
  }
  const url = environment.SUPABASE_URL?.trim();
  const readKey = environment.SUPABASE_READ_KEY?.trim();
  if (!url || !readKey) {
    return new NoopSupabaseBridge();
  }
  return new SupabaseLoreBridge(
    createClient(url, readKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    positiveNumber(environment.SOURCE_ACTIVITY_WINDOW_MINUTES, 15),
    positiveNumber(environment.SOURCE_ACTIVITY_CAP, 10),
  );
}

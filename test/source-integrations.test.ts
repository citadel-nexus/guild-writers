// ─── CGRF Header ──────────────────────────────
// File:        test/source-integrations.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/gitlab.ts, src/integrations/supabase.ts, src/integrations/coordinator.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/integrations/gitlab.ts; VALIDATES src/integrations/supabase.ts; VALIDATES src/integrations/coordinator.ts
// DAG Node:    writers.test.source_integrations
// Intent:      Verify private-source bridges emit only aggregate, opaque, fail-soft floor signals.
// ────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  LivingWorldFloor,
  type FloorEventPublisher,
  type FloorTelemetry,
} from '../src/automation/livingworld-emitter.js';
import { IntegrationCoordinator } from '../src/integrations/coordinator.js';
import { createGitLabLoreBridge, NoopGitLabBridge } from '../src/integrations/gitlab.js';
import { GUILD_COMMS_SUBJECTS, GuildCommsBridge } from '../src/integrations/guild-comms.js';
import type { CircuitBreaker } from '../src/integrations/posthog.js';
import type { LivingWorldSource, SanitizedSourceSnapshot } from '../src/integrations/sources.js';
import {
  createSupabaseLoreBridge,
  NoopSupabaseBridge,
  SupabaseLoreBridge,
} from '../src/integrations/supabase.js';
import { LivingWorldState } from '../src/livingworld/state.js';

class FakeCountQuery implements PromiseLike<{
  count: number;
  error: null;
}> {
  private status: string | undefined;
  private since: string | undefined;

  constructor(
    private readonly table: string,
    private readonly counts: Record<string, number>,
  ) {}

  select(): this {
    return this;
  }

  eq(_column: string, value: string): this {
    this.status = value;
    return this;
  }

  gte(_column: string, value: string): this {
    this.since = value;
    return this;
  }

  then<TResult1 = { count: number; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { count: number; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const qualifier = this.status ?? (this.since === undefined ? 'total' : 'recent');
    return Promise.resolve({ count: this.counts[`${this.table}:${qualifier}`] ?? 0, error: null })
      .then(onfulfilled, onrejected);
  }
}

class FakeChannel {
  readonly callbacks: Array<() => void> = [];
  on(_type: string, _filter: object, callback: () => void): this {
    this.callbacks.push(callback);
    return this;
  }
  subscribe(): this {
    return this;
  }
}

function fakeSupabaseClient(): { client: SupabaseClient; channel: FakeChannel } {
  const channel = new FakeChannel();
  const counts = {
    'lore_entries:total': 100,
    'lore_entries:recent': 3,
    'rpg_sessions:total': 50,
    'rpg_sessions:compiled': 50,
    'rpg_sessions:recent': 2,
  };
  const client = {
    from: (table: string) => new FakeCountQuery(table, counts),
    channel: () => channel,
    removeChannel: vi.fn(async () => 'ok'),
  } as unknown as SupabaseClient;
  return { client, channel };
}

describe('GitLab sanitized bridge', () => {
  it('returns opaque quests and aggregate activity without private metadata', async () => {
    const now = new Date().toISOString();
    const fetchMock: typeof fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes('/pipelines')) {
        return new Response(JSON.stringify([{ status: 'running', updated_at: now }]));
      }
      if (url.includes('/merge_requests')) {
        return new Response(
          JSON.stringify([
            { iid: 41, state: 'opened', updated_at: now, title: 'private title', author: 'private' },
            { iid: 42, state: 'merged', updated_at: now, title: 'private title' },
          ]),
        );
      }
      return new Response(JSON.stringify([{ committed_date: now, author_name: 'private' }]));
    });
    const bridge = createGitLabLoreBridge(
      {
        GITLAB_BASE_URL: 'https://gitlab.example.test',
        GITLAB_PROJECT_ID: 'private/project',
        GITLAB_READ_TOKEN: 'runtime-token',
        GITLAB_LORE_PATH: 'private/lore',
        SOURCE_ID_HMAC_KEY: 'runtime-hmac',
        SOURCE_ACTIVITY_CAP: '10',
      },
      fetchMock,
    );

    const snapshot = await bridge.snapshot();

    expect(snapshot.activityLevel).toBe(0.4);
    expect(snapshot.quests).toEqual([
      { id: expect.stringMatching(/^gl-[a-f0-9]{24}$/), title: 'Editorial merge request', state: 'open' },
      { id: expect.stringMatching(/^gl-[a-f0-9]{24}$/), title: 'Editorial merge request', state: 'closed' },
    ]);
    expect(JSON.stringify(snapshot)).not.toContain('private title');
    expect(JSON.stringify(snapshot)).not.toContain('private/project');
  });

  it('is quiet when unconfigured or unavailable', async () => {
    expect(createGitLabLoreBridge({})).toBeInstanceOf(NoopGitLabBridge);
    const bridge = createGitLabLoreBridge(
      {
        GITLAB_BASE_URL: 'https://gitlab.example.test',
        GITLAB_PROJECT_ID: 'project',
        GITLAB_READ_TOKEN: 'runtime-token',
        GITLAB_LORE_PATH: 'lore',
        SOURCE_ID_HMAC_KEY: 'runtime-hmac',
      },
      vi.fn(async () => new Response('{}', { status: 503 })),
    );
    await expect(bridge.snapshot()).resolves.toMatchObject({ activityLevel: 0, quests: [] });
  });
});

describe('Supabase count-only bridge', () => {
  it('derives activity, pipeline quest, and progression from counts', async () => {
    const { client } = fakeSupabaseClient();
    const bridge = new SupabaseLoreBridge(client, 15, 10);

    await expect(bridge.snapshot()).resolves.toMatchObject({
      source: 'supabase',
      activityLevel: 0.5,
      quests: [{ id: 'session-to-lore-pipeline', state: 'closed' }],
      progression: { loreEntriesPublished: 100, questsCompleted: 50 },
    });
  });

  it('refreshes counts on realtime events without exposing payloads', async () => {
    const { client, channel } = fakeSupabaseClient();
    const bridge = new SupabaseLoreBridge(client);
    const snapshots: SanitizedSourceSnapshot[] = [];
    const unsubscribe = bridge.subscribe((snapshot) => snapshots.push(snapshot));

    channel.callbacks[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(snapshots).toHaveLength(1);
    expect(JSON.stringify(snapshots[0])).not.toContain('payload');
    await unsubscribe();
  });

  it('no-ops without runtime config', () => {
    expect(createSupabaseLoreBridge({})).toBeInstanceOf(NoopSupabaseBridge);
  });

  it('uses injected clients and stays quiet on count errors', async () => {
    const { client } = fakeSupabaseClient();
    expect(createSupabaseLoreBridge({}, client)).toBeInstanceOf(SupabaseLoreBridge);

    const failingClient = {
      from: () => ({
        select: () => ({
          eq() { return this; },
          gte() { return this; },
          then(resolve: (value: { count: null; error: Error }) => unknown) {
            return Promise.resolve(resolve({ count: null, error: new Error('offline') }));
          },
        }),
      }),
    } as unknown as SupabaseClient;
    const bridge = new SupabaseLoreBridge(failingClient);

    await expect(bridge.snapshot()).resolves.toMatchObject({ activityLevel: 0, quests: [] });
    const noop = new NoopSupabaseBridge();
    await expect(noop.snapshot()).resolves.toMatchObject({ activityLevel: 0, quests: [] });
    await expect(noop.subscribe(() => {})()).resolves.toBeUndefined();
  });
});

describe('integration coordinator', () => {
  it('merges source snapshots and publishes upward status', async () => {
    const events: Array<{ subject: string; payload: string }> = [];
    const publisher: FloorEventPublisher = {
      available: true,
      async publish(subject, payload): Promise<void> {
        events.push({ subject, payload });
      },
      async close(): Promise<void> {},
    };
    const telemetry: FloorTelemetry = {
      activityHeartbeat(): void {},
      questThroughput(): void {},
      championTransition(): void {},
      loreCompilation(): void {},
      eventPublishFailure(): void {},
      async trace<T>(
        _operation: string,
        _tags: Readonly<Record<string, string | number>>,
        callback: () => Promise<T>,
      ): Promise<T> { return callback(); },
      async close(): Promise<void> {},
    };
    const floor = new LivingWorldFloor(new LivingWorldState(), publisher, telemetry);
    const source = (snapshot: SanitizedSourceSnapshot): LivingWorldSource => ({
      configured: true,
      async snapshot(): Promise<SanitizedSourceSnapshot> { return snapshot; },
    });
    const gitlab = source({
      source: 'gitlab',
      activityLevel: 0.6,
      quests: [{ id: 'gl-q', title: 'Editorial merge request', state: 'open' }],
      progression: { questsCompleted: 10 },
      observedAt: new Date().toISOString(),
    });
    const supabase = source({
      source: 'supabase',
      activityLevel: 0.8,
      quests: [],
      progression: { loreEntriesPublished: 25, championUptimePercent: 95 },
      observedAt: new Date().toISOString(),
    }) as unknown as NoopSupabaseBridge;
    const circuit: CircuitBreaker = { async isOpen(): Promise<boolean> { return false; } };
    const coordinator = new IntegrationCoordinator(
      floor,
      circuit,
      gitlab,
      supabase,
      new GuildCommsBridge(publisher),
    );

    await coordinator.poll();

    expect(floor.realmFeed()).toMatchObject({
      activity_level: 0.8,
      structures: [{ kind: 'hall', level: 2 }],
    });
    expect(events.some((event) => event.subject === GUILD_COMMS_SUBJECTS.upwardStatus)).toBe(true);
  });

  it('starts realtime refreshes, stops cleanly, and skips circuit-broken sources', async () => {
    const publisher: FloorEventPublisher = {
      available: false,
      async publish(): Promise<void> {},
      async close(): Promise<void> {},
    };
    const telemetry: FloorTelemetry = {
      activityHeartbeat(): void {},
      questThroughput(): void {},
      championTransition(): void {},
      loreCompilation(): void {},
      eventPublishFailure(): void {},
      async trace<T>(
        _operation: string,
        _tags: Readonly<Record<string, string | number>>,
        callback: () => Promise<T>,
      ): Promise<T> { return callback(); },
      async close(): Promise<void> {},
    };
    const floor = new LivingWorldFloor(new LivingWorldState(), publisher, telemetry);
    const snapshot = vi.fn(async (): Promise<SanitizedSourceSnapshot> => ({
      source: 'gitlab',
      activityLevel: 0,
      quests: [],
      progression: {},
      observedAt: new Date().toISOString(),
    }));
    const gitlab: LivingWorldSource = { configured: true, snapshot };
    const unsubscribe = vi.fn(async () => {});
    const subscribe = vi.fn(() => unsubscribe);
    const supabase = {
      configured: true,
      snapshot: vi.fn(async (): Promise<SanitizedSourceSnapshot> => ({
        source: 'supabase',
        activityLevel: 0,
        quests: [],
        progression: {},
        observedAt: new Date().toISOString(),
      })),
      subscribe,
    } as unknown as SupabaseLoreBridge;
    const openCircuit: CircuitBreaker = { async isOpen(): Promise<boolean> { return true; } };
    const blocked = new IntegrationCoordinator(
      floor,
      openCircuit,
      gitlab,
      supabase,
      new GuildCommsBridge(publisher),
      60_000,
    );

    await blocked.start();
    await blocked.stop();
    expect(snapshot).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();

    const closedCircuit: CircuitBreaker = { async isOpen(): Promise<boolean> { return false; } };
    const active = new IntegrationCoordinator(
      floor,
      closedCircuit,
      gitlab,
      supabase,
      new GuildCommsBridge(publisher),
      60_000,
    );
    await active.start();
    await active.stop();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('contains source, realtime subscription, and unsubscribe failures', async () => {
    const publisher: FloorEventPublisher = {
      available: false,
      async publish(): Promise<void> {},
      async close(): Promise<void> {},
    };
    const telemetry: FloorTelemetry = {
      activityHeartbeat(): void {},
      questThroughput(): void {},
      championTransition(): void {},
      loreCompilation(): void {},
      eventPublishFailure(): void {},
      async trace<T>(
        _operation: string,
        _tags: Readonly<Record<string, string | number>>,
        callback: () => Promise<T>,
      ): Promise<T> { return callback(); },
      async close(): Promise<void> {},
    };
    const floor = new LivingWorldFloor(new LivingWorldState(), publisher, telemetry);
    const failingSource: LivingWorldSource = {
      configured: true,
      async snapshot(): Promise<SanitizedSourceSnapshot> { throw new Error('offline'); },
    };
    const failingSubscribe = {
      configured: true,
      async snapshot(): Promise<SanitizedSourceSnapshot> { throw new Error('offline'); },
      subscribe(): () => Promise<void> { throw new Error('offline'); },
    } as unknown as SupabaseLoreBridge;
    const circuit: CircuitBreaker = { async isOpen(): Promise<boolean> { return false; } };
    const coordinator = new IntegrationCoordinator(
      floor,
      circuit,
      failingSource,
      failingSubscribe,
      new GuildCommsBridge(publisher),
      60_000,
    );

    await expect(coordinator.start()).resolves.toBeUndefined();
    await expect(coordinator.stop()).resolves.toBeUndefined();

    const failingUnsubscribe = {
      configured: true,
      async snapshot(): Promise<SanitizedSourceSnapshot> {
        return {
          source: 'supabase',
          activityLevel: 0,
          quests: [],
          progression: {},
          observedAt: new Date().toISOString(),
        };
      },
      subscribe(): () => Promise<void> {
        return async () => { throw new Error('offline'); };
      },
    } as unknown as SupabaseLoreBridge;
    const withFailingUnsubscribe = new IntegrationCoordinator(
      floor,
      circuit,
      { configured: false, snapshot: failingSource.snapshot },
      failingUnsubscribe,
      new GuildCommsBridge(publisher),
      60_000,
    );
    await withFailingUnsubscribe.start();
    await expect(withFailingUnsubscribe.stop()).resolves.toBeUndefined();
  });
});

// ─── CGRF Header ──────────────────────────────
// File:        test/engagement-integrations.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/posthog.ts, src/integrations/customerio.ts, src/integrations/hooks.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/integrations/posthog.ts; VALIDATES src/integrations/customerio.ts; VALIDATES src/integrations/hooks.ts
// DAG Node:    writers.test.engagement_integrations
// Intent:      Verify aggregate analytics, feature flags, messaging, and pseudonymous segmentation.
// ──────────────────────────────────────────────

import { describe, expect, it, vi } from 'vitest';

import {
  createCustomerIoIntegration,
  NoopCustomerIo,
} from '../src/integrations/customerio.js';
import { CompositeFloorHooks } from '../src/integrations/hooks.js';
import {
  createPostHogIntegration,
  NoopPostHog,
  PostHogIntegration,
  type PostHogClientLike,
} from '../src/integrations/posthog.js';

class FakePostHog implements PostHogClientLike {
  readonly events: Array<{ distinctId: string; event: string; properties?: Record<string, unknown> }> = [];
  flag: boolean | string | undefined = false;
  shouldFailFlag = false;
  shutdownCalled = false;

  capture(event: { distinctId: string; event: string; properties?: Record<string, unknown> }): void {
    this.events.push(event);
  }

  async getFeatureFlag(): Promise<boolean | string | undefined> {
    if (this.shouldFailFlag) throw new Error('offline');
    return this.flag;
  }

  async shutdown(): Promise<void> {
    this.shutdownCalled = true;
  }
}

describe('PostHog integration', () => {
  it('tracks only aggregate guild events and evaluates circuit flags', async () => {
    const client = new FakePostHog();
    const integration = new PostHogIntegration(client);

    integration.activity(0.4, 'supabase');
    integration.quest({ id: 'q1', title: 'Public quest', state: 'open' });
    integration.quest({ id: 'q1', title: 'Public quest', state: 'closed' });
    integration.champion('idle', 'working');
    integration.loreCompilation('success');
    integration.engagement('realm');
    integration.engagement('mobile');
    client.flag = 'on';

    expect(await integration.isOpen('gitlab')).toBe(true);
    expect(client.events.map((event) => event.event)).toEqual([
      'writers_activity_observed',
      'writers_quest_completed',
      'writers_champion_state_changed',
      'writers_lore_compilation',
      'writers_realm_feed_viewed',
      'writers_mobile_app_engaged',
    ]);
    expect(client.events.every((event) => event.distinctId === 'guild:writers')).toBe(true);
    await integration.close();
    expect(client.shutdownCalled).toBe(true);
  });

  it('fails open-for-service when flags are unavailable and no-ops without config', async () => {
    const client = new FakePostHog();
    client.shouldFailFlag = true;
    const integration = new PostHogIntegration(client);

    expect(await integration.isOpen('supabase')).toBe(false);
    expect(createPostHogIntegration({})).toBeInstanceOf(NoopPostHog);
    expect(createPostHogIntegration({}, client)).toBeInstanceOf(PostHogIntegration);
  });

  it('contains capture and shutdown client failures', async () => {
    const client: PostHogClientLike = {
      capture(): void { throw new Error('offline'); },
      async getFeatureFlag(): Promise<boolean> { return true; },
      async shutdown(): Promise<void> { throw new Error('offline'); },
    };
    const integration = new PostHogIntegration(client);

    expect(() => integration.activity(0.2, 'test')).not.toThrow();
    expect(await integration.isOpen('customerio')).toBe(true);
    await expect(integration.close()).resolves.toBeUndefined();
  });
});

describe('Customer.io integration', () => {
  const environment = {
    CUSTOMERIO_APP_API_URL: 'https://messaging.example.test',
    CUSTOMERIO_APP_API_KEY: 'runtime-app-key',
    CUSTOMERIO_TRACK_API_URL: 'https://track.example.test',
    CUSTOMERIO_SITE_ID: 'site',
    CUSTOMERIO_TRACK_API_KEY: 'runtime-track-key',
    CUSTOMERIO_ID_HMAC_KEY: 'runtime-hmac-key',
    CUSTOMERIO_QUEST_BROADCAST_ID: 'quest-broadcast',
    CUSTOMERIO_LORE_BROADCAST_ID: 'lore-broadcast',
    CUSTOMERIO_CHAMPION_BROADCAST_ID: 'champion-broadcast',
  };

  it('segments members under an HMAC identifier and coarse activity band', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock: typeof fetch = vi.fn(async (input, init) => {
      requests.push({ url: String(input), init });
      return new Response('{}', { status: 200 });
    });
    const integration = createCustomerIoIntegration(environment, fetchMock);

    await expect(integration.segmentMember('private-member-id', 0.8)).resolves.toBe(true);
    const serialized = JSON.stringify(requests);
    expect(serialized).not.toContain('private-member-id');
    expect(serialized).toContain('high');
    expect(requests[0]?.url).toMatch(/customers\/[a-f0-9]{64}$/);
  });

  it('emits configured broadcasts through composite hooks and no-ops when unconfigured', async () => {
    const urls: string[] = [];
    const fetchMock: typeof fetch = vi.fn(async (input) => {
      urls.push(String(input));
      return new Response('{}', { status: 202 });
    });
    const integration = createCustomerIoIntegration(environment, fetchMock);
    const hooks = new CompositeFloorHooks([integration]);

    hooks.quest({ id: 'q1', title: 'Public quest', state: 'open' });
    hooks.quest({ id: 'q1', title: 'Public quest', state: 'closed' });
    hooks.champion('idle', 'blocked');
    hooks.loreCompilation('success');
    hooks.loreCompilation('failure');
    hooks.activity(0.5, 'test');
    hooks.engagement('mobile');
    await Promise.resolve();

    expect(urls).toEqual([
      'https://messaging.example.test/v1/broadcasts/quest-broadcast/triggers',
      'https://messaging.example.test/v1/broadcasts/champion-broadcast/triggers',
      'https://messaging.example.test/v1/broadcasts/lore-broadcast/triggers',
    ]);
    expect(createCustomerIoIntegration({})).toBeInstanceOf(NoopCustomerIo);
    await hooks.close();
  });

  it('fails soft for messaging transport errors and covers each segment band', async () => {
    const fetchMock: typeof fetch = vi.fn(async () => {
      throw new Error('offline');
    });
    const integration = createCustomerIoIntegration(environment, fetchMock);

    await expect(integration.segmentMember('member-1', 0)).resolves.toBe(false);
    await expect(integration.segmentMember('member-2', 0.5)).resolves.toBe(false);
    integration.quest({ id: 'q1', title: 'Quest', state: 'open' });
    await Promise.resolve();

    const noop = new NoopCustomerIo();
    noop.activity(0, 'none');
    noop.quest({ id: 'q', title: 'Quest', state: 'open' });
    noop.champion('idle', 'working');
    noop.loreCompilation('failure');
    noop.engagement('realm');
    await expect(noop.segmentMember('member', 0)).resolves.toBe(false);
    await noop.close();
  });

  it('suppresses messaging and segmentation while the Customer.io circuit is open', async () => {
    const fetchMock: typeof fetch = vi.fn(async () => new Response('{}', { status: 202 }));
    const circuit = { async isOpen(): Promise<boolean> { return true; } };
    const integration = createCustomerIoIntegration(environment, fetchMock, circuit);

    integration.quest({ id: 'q1', title: 'Quest', state: 'open' });
    integration.champion('idle', 'working');
    integration.loreCompilation('success');
    await expect(integration.segmentMember('member', 0.8)).resolves.toBe(false);
    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('isolates a failing hook from later hooks', async () => {
    const client = new FakePostHog();
    const posthog = new PostHogIntegration(client);
    const failing = {
      activity(): void { throw new Error('bad hook'); },
      quest(): void { throw new Error('bad hook'); },
      champion(): void { throw new Error('bad hook'); },
      loreCompilation(): void { throw new Error('bad hook'); },
      engagement(): void { throw new Error('bad hook'); },
      async close(): Promise<void> { throw new Error('bad hook'); },
    };
    const hooks = new CompositeFloorHooks([failing, posthog]);

    hooks.activity(0.1, 'test');
    hooks.quest({ id: 'q', title: 'Quest', state: 'closed' });
    hooks.champion('idle', 'working');
    hooks.loreCompilation('success');
    hooks.engagement('realm');
    await hooks.close();

    expect(client.events).toHaveLength(5);
  });
});

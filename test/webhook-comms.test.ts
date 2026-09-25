// ─── CGRF Header ──────────────────────────────
// File:        test/webhook-comms.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/routes/n8n.ts, src/integrations/guild-comms.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/routes/n8n.ts; VALIDATES src/integrations/guild-comms.ts
// DAG Node:    writers.test.webhook_comms
// Intent:      Prove n8n requires fresh HMAC signatures and cross-guild messages match public schemas.
// ──────────────────────────────────────────────

import { createHmac } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

import { describe, expect, it } from 'vitest';

import {
  LivingWorldFloor,
  type FloorEventPublisher,
  type FloorTelemetry,
} from '../src/automation/livingworld-emitter.js';
import {
  GUILD_COMMS_SUBJECTS,
  GuildCommsBridge,
  type GuildCommsMessage,
} from '../src/integrations/guild-comms.js';
import type { CircuitBreaker } from '../src/integrations/posthog.js';
import { LivingWorldState } from '../src/livingworld/state.js';
import { createN8nWebhook, N8nWebhook, NoopN8nWebhook } from '../src/routes/n8n.js';

class RecordingPublisher implements FloorEventPublisher {
  readonly available = true;
  readonly events: Array<{ subject: string; payload: string }> = [];
  readonly handlers = new Map<string, (payload: string) => Promise<void>>();

  async publish(subject: string, payload: string): Promise<void> {
    this.events.push({ subject, payload });
  }

  async subscribe(subject: string, handler: (payload: string) => Promise<void>): Promise<() => void> {
    this.handlers.set(subject, handler);
    return () => this.handlers.delete(subject);
  }

  async close(): Promise<void> {}
}

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

function signatureHeaders(secret: string, timestamp: number, body: string): IncomingHttpHeaders {
  return {
    'x-citadel-timestamp': String(timestamp),
    'x-citadel-signature': `sha256=${createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex')}`,
  };
}

describe('n8n webhook', () => {
  const secret = 'runtime-webhook-secret';
  const now = new Date('2026-09-25T19:00:00.000Z');
  const timestamp = Math.floor(now.getTime() / 1_000);

  function setup(circuitOpen = false): {
    floor: LivingWorldFloor;
    webhook: N8nWebhook;
    publisher: RecordingPublisher;
  } {
    const publisher = new RecordingPublisher();
    const floor = new LivingWorldFloor(new LivingWorldState(), publisher, telemetry);
    const circuit: CircuitBreaker = {
      async isOpen(): Promise<boolean> { return circuitOpen; },
    };
    const comms = new GuildCommsBridge(publisher, () => now);
    return {
      floor,
      webhook: new N8nWebhook(secret, floor, comms, circuit, () => now),
      publisher,
    };
  }

  async function send(webhook: N8nWebhook, event: object): Promise<number> {
    const body = JSON.stringify(event);
    return (await webhook.handle(body, signatureHeaders(secret, timestamp, body))).status;
  }

  it('accepts signed floor and progression events', async () => {
    const { floor, webhook } = setup();

    await expect(send(webhook, { event_type: 'activity', activity_level: 0.6 })).resolves.toBe(202);
    await expect(
      send(webhook, { event_type: 'quest', id: 'q1', title: 'Public quest', state: 'open' }),
    ).resolves.toBe(202);
    await expect(send(webhook, { event_type: 'champion', state: 'working' })).resolves.toBe(202);
    await expect(
      send(webhook, {
        event_type: 'progression',
        lore_entries_published: 25,
        quests_completed: 10,
        champion_uptime_percent: 95,
      }),
    ).resolves.toBe(202);

    expect(floor.realmFeed()).toMatchObject({
      activity_level: 0.6,
      quests: [{ id: 'q1', state: 'open' }],
      structures: [{ level: 2 }],
    });
    expect(floor.partyFeed().party[0]?.state).toBe('working');
  });

  it('publishes lore handoff and commission attribution for signed publication events', async () => {
    const { webhook, publisher } = setup();

    await expect(send(webhook, { event_type: 'lore_published', work_id: 'lore-42' })).resolves.toBe(202);

    expect(publisher.events.map((event) => event.subject)).toEqual([
      GUILD_COMMS_SUBJECTS.creator,
      GUILD_COMMS_SUBJECTS.finance,
    ]);
  });

  it('rejects invalid, stale, malformed, and circuit-broken requests', async () => {
    const { webhook } = setup();
    await expect(webhook.handle('{}', {})).resolves.toMatchObject({ status: 401 });
    await expect(
      webhook.handle('{}', signatureHeaders(secret, timestamp - 600, '{}')),
    ).resolves.toMatchObject({ status: 401 });
    const malformed = '{';
    await expect(
      webhook.handle(malformed, signatureHeaders(secret, timestamp, malformed)),
    ).resolves.toMatchObject({ status: 400 });
    const blocked = setup(true).webhook;
    await expect(send(blocked, { event_type: 'activity', activity_level: 1 })).resolves.toBe(503);
  });

  it('rejects every unsupported event shape and malformed authentication header', async () => {
    const { webhook } = setup();

    await expect(send(webhook, { event_type: 'quest', title: 'Missing id', state: 'open' })).resolves.toBe(400);
    await expect(send(webhook, { event_type: 'quest', id: 'q', title: 'Quest', state: 'paused' })).resolves.toBe(400);
    await expect(send(webhook, { event_type: 'champion', state: 'offline' })).resolves.toBe(400);
    await expect(send(webhook, { event_type: 'lore_published', work_id: '../private' })).resolves.toBe(400);
    await expect(send(webhook, { event_type: 'unknown' })).resolves.toBe(400);
    await expect(
      webhook.handle('{}', {
        'x-citadel-timestamp': ['not-a-number'],
        'x-citadel-signature': ['sha256=not-hex'],
      }),
    ).resolves.toMatchObject({ status: 401 });
  });

  it('creates a no-op handler until the HMAC secret is configured', async () => {
    const { floor, publisher } = setup();
    const circuit: CircuitBreaker = { async isOpen(): Promise<boolean> { return false; } };
    const comms = new GuildCommsBridge(publisher);
    const noop = createN8nWebhook(floor, comms, circuit, {});
    const configured = createN8nWebhook(
      floor,
      comms,
      circuit,
      { N8N_WEBHOOK_SECRET: secret },
    );

    expect(noop).toBeInstanceOf(NoopN8nWebhook);
    await expect(noop.handle('{}', {})).resolves.toMatchObject({ status: 503 });
    expect(configured).toBeInstanceOf(N8nWebhook);
  });
});

describe('guild communications', () => {
  it('publishes versioned public messages and invokes subscribers', async () => {
    const publisher = new RecordingPublisher();
    const bridge = new GuildCommsBridge(
      publisher,
      () => new Date('2026-09-25T19:00:00.000Z'),
    );
    const received: GuildCommsMessage[] = [];
    const unsubscribe = await bridge.subscribe({ creator: (message) => received.push(message) });

    await expect(bridge.publishLoreHandoff('lore-1')).resolves.toBe(true);
    await expect(bridge.publishCommissionAttribution('lore-1')).resolves.toBe(true);
    await expect(
      bridge.publishUpwardStatus({
        activity_level: 0.4,
        open_quests: 2,
        champion_state: 'working',
        structure_level: 2,
      }),
    ).resolves.toBe(true);
    await publisher.handlers.get(GUILD_COMMS_SUBJECTS.creator)?.(
      publisher.events[0]?.payload ?? '{}',
    );

    expect(received).toMatchObject([{ schema_version: '1.0', kind: 'lore_handoff' }]);
    expect(publisher.events.map((event) => event.subject)).toEqual([
      GUILD_COMMS_SUBJECTS.creator,
      GUILD_COMMS_SUBJECTS.finance,
      GUILD_COMMS_SUBJECTS.upwardStatus,
    ]);
    await expect(bridge.publishLoreHandoff('../private')).resolves.toBe(false);
    await expect(bridge.publishCommissionAttribution('../private')).resolves.toBe(false);
    unsubscribe();
  });

  it('ignores invalid inbound messages and contains publisher failures', async () => {
    const publisher = new RecordingPublisher();
    const received: GuildCommsMessage[] = [];
    const bridge = new GuildCommsBridge(publisher);
    await bridge.subscribe({ creator: (message) => received.push(message) });

    await publisher.handlers.get(GUILD_COMMS_SUBJECTS.creator)?.('not-json');
    await publisher.handlers.get(GUILD_COMMS_SUBJECTS.creator)?.(
      JSON.stringify({ schema_version: '2.0', guild: 'writers', kind: 'lore_handoff' }),
    );
    expect(received).toEqual([]);

    const failingPublisher: FloorEventPublisher = {
      available: true,
      async publish(): Promise<void> { throw new Error('offline'); },
      async close(): Promise<void> {},
    };
    await expect(new GuildCommsBridge(failingPublisher).publishLoreHandoff('lore-2')).resolves.toBe(false);
    const quietPublisher: FloorEventPublisher = {
      available: false,
      async publish(): Promise<void> {},
      async close(): Promise<void> {},
    };
    const quiet = new GuildCommsBridge(quietPublisher);
    await expect(quiet.publishLoreHandoff('lore-3')).resolves.toBe(false);
    expect(await quiet.subscribe({})).toEqual(expect.any(Function));

    const failingSubscriber: FloorEventPublisher = {
      available: true,
      async publish(): Promise<void> {},
      async subscribe(): Promise<() => void> { throw new Error('offline'); },
      async close(): Promise<void> {},
    };
    await expect(
      new GuildCommsBridge(failingSubscriber).subscribe({ creator: () => {} }),
    ).resolves.toEqual(expect.any(Function));
  });

  it('suppresses cross-guild publishing while its circuit is open', async () => {
    const publisher = new RecordingPublisher();
    const circuit: CircuitBreaker = { async isOpen(): Promise<boolean> { return true; } };
    const bridge = new GuildCommsBridge(publisher, () => new Date(), circuit);

    await expect(bridge.publishLoreHandoff('lore-4')).resolves.toBe(false);
    await expect(bridge.publishCommissionAttribution('lore-4')).resolves.toBe(false);
    expect(publisher.events).toEqual([]);
  });
});

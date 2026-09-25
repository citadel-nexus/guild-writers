// ─── CGRF Header ──────────────────────────────
// File:        src/routes/n8n.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/automation/livingworld-emitter.ts, src/integrations/guild-comms.ts, src/integrations/posthog.ts
// EnumType:    Route
// EnumEdges:   CONSUMES src/automation/livingworld-emitter.ts; CONSUMES src/integrations/guild-comms.ts; PRODUCES /webhooks/n8n
// DAG Node:    writers.route.n8n
// Intent:      Accept only timestamped HMAC-authenticated workflow events and sanitize them into floor actions.
// ──────────────────────────────────────────────

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

import type { LivingWorldFloor } from '../automation/livingworld-emitter.js';
import type { GuildCommsBridge } from '../integrations/guild-comms.js';
import type { CircuitBreaker } from '../integrations/posthog.js';

const MAX_CLOCK_SKEW_MS = 5 * 60_000;
const PUBLIC_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

export interface N8nWebhookHandler {
  handle(rawBody: string, headers: IncomingHttpHeaders): Promise<WebhookResult>;
}

function header(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export class N8nWebhook implements N8nWebhookHandler {
  constructor(
    private readonly secret: string,
    private readonly floor: LivingWorldFloor,
    private readonly guildComms: GuildCommsBridge,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async handle(rawBody: string, headers: IncomingHttpHeaders): Promise<WebhookResult> {
    if (!this.authenticated(rawBody, headers)) {
      return { status: 401, body: { error: 'invalid_signature' } };
    }
    if (await this.circuitBreaker.isOpen('n8n')) {
      return { status: 503, body: { error: 'circuit_open' } };
    }

    try {
      const event = JSON.parse(rawBody) as Record<string, unknown>;
      const eventType = event.event_type;
      if (eventType === 'activity') {
        await this.floor.heartbeat(event.activity_level, 'n8n');
      } else if (eventType === 'quest') {
        if (
          typeof event.id !== 'string' ||
          typeof event.title !== 'string' ||
          !['open', 'closed'].includes(String(event.state))
        ) {
          return this.invalidEvent();
        }
        await this.floor.questChanged({
          id: event.id,
          title: event.title,
          state: event.state as 'open' | 'closed',
        });
      } else if (eventType === 'champion') {
        if (!['idle', 'working', 'blocked'].includes(String(event.state))) {
          return this.invalidEvent();
        }
        await this.floor.championChanged(event.state);
      } else if (eventType === 'lore_published') {
        if (typeof event.work_id !== 'string' || !PUBLIC_ID.test(event.work_id)) {
          return this.invalidEvent();
        }
        this.floor.recordLoreCompilation('success');
        await Promise.allSettled([
          this.guildComms.publishLoreHandoff(event.work_id),
          this.guildComms.publishCommissionAttribution(event.work_id),
        ]);
      } else if (eventType === 'progression') {
        this.floor.updateProgression({
          loreEntriesPublished: Number(event.lore_entries_published),
          questsCompleted: Number(event.quests_completed),
          championUptimePercent: Number(event.champion_uptime_percent),
        });
      } else {
        return this.invalidEvent();
      }
      return { status: 202, body: { accepted: true, event_type: eventType } };
    } catch {
      return { status: 400, body: { error: 'invalid_json' } };
    }
  }

  private authenticated(rawBody: string, headers: IncomingHttpHeaders): boolean {
    const timestamp = header(headers, 'x-citadel-timestamp');
    const signature = header(headers, 'x-citadel-signature')?.replace(/^sha256=/, '');
    if (!timestamp || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
    const timestampMs = Number(timestamp) * 1_000;
    if (!Number.isFinite(timestampMs) || Math.abs(this.now().getTime() - timestampMs) > MAX_CLOCK_SKEW_MS) {
      return false;
    }
    const expected = createHmac('sha256', this.secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  }

  private invalidEvent(): WebhookResult {
    return { status: 400, body: { error: 'invalid_event' } };
  }
}

export class NoopN8nWebhook implements N8nWebhookHandler {
  async handle(_rawBody: string, _headers: IncomingHttpHeaders): Promise<WebhookResult> {
    return { status: 503, body: { error: 'webhook_not_configured' } };
  }
}

export function createN8nWebhook(
  floor: LivingWorldFloor,
  guildComms: GuildCommsBridge,
  circuitBreaker: CircuitBreaker,
  environment: NodeJS.ProcessEnv = process.env,
): N8nWebhook | NoopN8nWebhook {
  const secret = environment.N8N_WEBHOOK_SECRET?.trim();
  return secret
    ? new N8nWebhook(secret, floor, guildComms, circuitBreaker)
    : new NoopN8nWebhook();
}

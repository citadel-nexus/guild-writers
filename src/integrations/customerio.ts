// ─── CGRF Header ──────────────────────────────
// File:        src/integrations/customerio.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/automation/livingworld-emitter.ts, src/integrations/posthog.ts
// EnumType:    Adapter
// EnumEdges:   CONSUMES src/automation/livingworld-emitter.ts; CONSUMES src/integrations/posthog.ts; PRODUCES customerio.guild-writers
// DAG Node:    writers.integration.customerio
// Intent:      Send sanitized guild notifications and segments without transmitting raw member identifiers.
// ──────────────────────────────────────────────

import { createHmac } from 'node:crypto';

import type {
  FloorHooks,
  LoreCompilationOutcome,
} from '../automation/livingworld-emitter.js';
import type { ChampionState, ClientSurface } from '../livingworld/contracts.js';
import type { QuestChange } from '../livingworld/state.js';
import type { CircuitBreaker } from './posthog.js';

type FetchLike = typeof fetch;
type BroadcastKind = 'quest' | 'lore' | 'champion';

interface CustomerIoConfiguration {
  appApiUrl: string;
  appApiKey: string;
  trackApiUrl: string;
  siteId: string;
  trackApiKey: string;
  idHmacKey: string;
  broadcastIds: Record<BroadcastKind, string>;
}

const CLOSED_CIRCUIT: CircuitBreaker = {
  async isOpen(): Promise<boolean> {
    return false;
  },
};

export class NoopCustomerIo implements FloorHooks {
  activity(_level: number, _method: string): void {}
  quest(_change: QuestChange): void {}
  champion(_previous: ChampionState, _next: ChampionState): void {}
  loreCompilation(_outcome: LoreCompilationOutcome): void {}
  engagement(_surface: ClientSurface): void {}
  async close(): Promise<void> {}
  async segmentMember(_memberId: string, _activityLevel: number): Promise<boolean> {
    return false;
  }
}

export class CustomerIoIntegration implements FloorHooks {
  constructor(
    private readonly configuration: CustomerIoConfiguration,
    private readonly fetchImplementation: FetchLike = fetch,
    private readonly circuitBreaker: CircuitBreaker = CLOSED_CIRCUIT,
  ) {}

  activity(_level: number, _method: string): void {}

  quest(change: QuestChange): void {
    if (change.state === 'open') {
      void this.broadcastWhenAvailable('quest', {
        guild: 'writers',
        quest_id: change.id,
        quest_title: change.title,
        state: change.state,
      });
    }
  }

  champion(_previous: ChampionState, next: ChampionState): void {
    void this.broadcastWhenAvailable('champion', {
      guild: 'writers',
      champion: 'Quill',
      state: next,
    });
  }

  loreCompilation(outcome: LoreCompilationOutcome): void {
    if (outcome === 'success') {
      void this.broadcastWhenAvailable('lore', {
        guild: 'writers',
        event: 'lore_published',
      });
    }
  }

  engagement(_surface: ClientSurface): void {}

  async close(): Promise<void> {}

  /** Assign a pseudonymous guild segment using source-derived activity. */
  async segmentMember(memberId: string, activityLevel: number): Promise<boolean> {
    if (await this.circuitBreaker.isOpen('customerio')) {
      return false;
    }
    const identifier = createHmac('sha256', this.configuration.idHmacKey)
      .update(memberId)
      .digest('hex');
    const normalized = Math.min(1, Math.max(0, activityLevel));
    const activityBand = normalized === 0 ? 'quiet' : normalized < 0.7 ? 'active' : 'high';
    return this.send(
      `${this.configuration.trackApiUrl}/api/v1/customers/${identifier}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.configuration.siteId}:${this.configuration.trackApiKey}`,
          ).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guild_membership: 'writers', activity_band: activityBand }),
      },
    );
  }

  private async broadcastWhenAvailable(
    kind: BroadcastKind,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    if (await this.circuitBreaker.isOpen('customerio')) {
      return false;
    }
    return this.broadcast(kind, data);
  }

  private async broadcast(kind: BroadcastKind, data: Record<string, unknown>): Promise<boolean> {
    const broadcastId = this.configuration.broadcastIds[kind];
    return this.send(
      `${this.configuration.appApiUrl}/v1/broadcasts/${encodeURIComponent(broadcastId)}/triggers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.configuration.appApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      },
    );
  }

  private async send(url: string, init: RequestInit): Promise<boolean> {
    try {
      const response = await this.fetchImplementation(url, init);
      return response.ok;
    } catch (error: unknown) {
      console.warn('writers_customerio_unavailable', {
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
      return false;
    }
  }
}

/** Create messaging hooks only when all secret-bearing runtime values are present. */
export function createCustomerIoIntegration(
  environment: NodeJS.ProcessEnv = process.env,
  fetchImplementation: FetchLike = fetch,
  circuitBreaker: CircuitBreaker = CLOSED_CIRCUIT,
): CustomerIoIntegration | NoopCustomerIo {
  const values = {
    appApiUrl: environment.CUSTOMERIO_APP_API_URL?.trim(),
    appApiKey: environment.CUSTOMERIO_APP_API_KEY?.trim(),
    trackApiUrl: environment.CUSTOMERIO_TRACK_API_URL?.trim(),
    siteId: environment.CUSTOMERIO_SITE_ID?.trim(),
    trackApiKey: environment.CUSTOMERIO_TRACK_API_KEY?.trim(),
    idHmacKey: environment.CUSTOMERIO_ID_HMAC_KEY?.trim(),
    quest: environment.CUSTOMERIO_QUEST_BROADCAST_ID?.trim(),
    lore: environment.CUSTOMERIO_LORE_BROADCAST_ID?.trim(),
    champion: environment.CUSTOMERIO_CHAMPION_BROADCAST_ID?.trim(),
  };
  if (Object.values(values).some((value) => !value)) {
    return new NoopCustomerIo();
  }

  return new CustomerIoIntegration(
    {
      appApiUrl: values.appApiUrl as string,
      appApiKey: values.appApiKey as string,
      trackApiUrl: values.trackApiUrl as string,
      siteId: values.siteId as string,
      trackApiKey: values.trackApiKey as string,
      idHmacKey: values.idHmacKey as string,
      broadcastIds: {
        quest: values.quest as string,
        lore: values.lore as string,
        champion: values.champion as string,
      },
    },
    fetchImplementation,
    circuitBreaker,
  );
}

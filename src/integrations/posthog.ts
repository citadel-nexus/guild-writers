// ─── CGRF Header ──────────────────────────────
// File:        src/integrations/posthog.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     posthog-node, src/automation/livingworld-emitter.ts
// EnumType:    Adapter
// EnumEdges:   CONSUMES src/automation/livingworld-emitter.ts; PRODUCES posthog.guild-writers
// DAG Node:    writers.integration.posthog
// Intent:      Track aggregate floor engagement and provide fail-soft feature-flag circuit breakers.
// ──────────────────────────────────────────────

import { PostHog } from 'posthog-node';

import type {
  FloorHooks,
  LoreCompilationOutcome,
} from '../automation/livingworld-emitter.js';
import type { ChampionState, ClientSurface } from '../livingworld/contracts.js';
import type { QuestChange } from '../livingworld/state.js';

const GUILD_DISTINCT_ID = 'guild:writers';

export type IntegrationName =
  | 'customerio'
  | 'gitlab'
  | 'supabase'
  | 'n8n'
  | 'guild-comms';

export interface CircuitBreaker {
  isOpen(integration: IntegrationName): Promise<boolean>;
}

export interface PostHogClientLike {
  capture(event: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }): void;
  getFeatureFlag(key: string, distinctId: string): Promise<boolean | string | undefined>;
  shutdown(): Promise<void>;
}

export class NoopPostHog implements FloorHooks, CircuitBreaker {
  activity(_level: number, _method: string): void {}
  quest(_change: QuestChange): void {}
  champion(_previous: ChampionState, _next: ChampionState): void {}
  loreCompilation(_outcome: LoreCompilationOutcome): void {}
  engagement(_surface: ClientSurface): void {}
  async isOpen(_integration: IntegrationName): Promise<boolean> {
    return false;
  }
  async close(): Promise<void> {}
}

export class PostHogIntegration implements FloorHooks, CircuitBreaker {
  constructor(private readonly client: PostHogClientLike) {}

  activity(level: number, method: string): void {
    this.capture('writers_activity_observed', { activity_level: level, method });
  }

  quest(change: QuestChange): void {
    if (change.state === 'closed') {
      this.capture('writers_quest_completed', { quest_id: change.id });
    }
  }

  champion(previous: ChampionState, next: ChampionState): void {
    this.capture('writers_champion_state_changed', { previous, next });
  }

  loreCompilation(outcome: LoreCompilationOutcome): void {
    this.capture('writers_lore_compilation', { outcome });
  }

  engagement(surface: ClientSurface): void {
    this.capture(
      surface === 'mobile' ? 'writers_mobile_app_engaged' : 'writers_realm_feed_viewed',
      { surface },
    );
  }

  async isOpen(integration: IntegrationName): Promise<boolean> {
    try {
      const value = await this.client.getFeatureFlag(
        `writers-circuit-break-${integration}`,
        GUILD_DISTINCT_ID,
      );
      return value === true || value === 'on';
    } catch (error: unknown) {
      console.warn('writers_posthog_flag_unavailable', {
        integration,
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.shutdown();
    } catch (error: unknown) {
      console.warn('writers_posthog_shutdown_failed', {
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  private capture(event: string, properties: Record<string, unknown>): void {
    try {
      this.client.capture({
        distinctId: GUILD_DISTINCT_ID,
        event,
        properties: { ...properties, guild: 'writers', seat: 'quill' },
      });
    } catch (error: unknown) {
      console.warn('writers_posthog_capture_failed', {
        event,
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
}

/** Create a PostHog adapter only when its public project key and host are configured. */
export function createPostHogIntegration(
  environment: NodeJS.ProcessEnv = process.env,
  client?: PostHogClientLike,
): PostHogIntegration | NoopPostHog {
  if (client !== undefined) {
    return new PostHogIntegration(client);
  }

  const apiKey = environment.POSTHOG_API_KEY?.trim();
  const host = environment.POSTHOG_HOST?.trim();
  if (!apiKey || !host) {
    return new NoopPostHog();
  }

  return new PostHogIntegration(
    new PostHog(apiKey, {
      host,
      flushAt: 20,
      flushInterval: 10_000,
    }),
  );
}

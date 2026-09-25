// ─── CGRF Header ──────────────────────────────
// File:        src/integrations/guild-comms.ts
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
// EnumEdges:   CONSUMES src/integrations/posthog.ts; PRODUCES citadel.guild.comms.writers→creator; PRODUCES citadel.guild.comms.writers→finance; PRODUCES citadel.creator.subguild.writers.status
// DAG Node:    writers.integration.guild_comms
// Intent:      Publish and consume public-safe inter-guild handoffs with versioned message schemas.
// ──────────────────────────────────────────────

import type { FloorEventPublisher } from '../automation/livingworld-emitter.js';
import type { ChampionState } from '../livingworld/contracts.js';
import type { StructureLevel } from '../livingworld/progression.js';
import type { CircuitBreaker } from './posthog.js';

export const GUILD_COMMS_SUBJECTS = Object.freeze({
  creator: 'citadel.guild.comms.writers→creator',
  finance: 'citadel.guild.comms.writers→finance',
  upwardStatus: 'citadel.creator.subguild.writers.status',
});

interface MessageEnvelope {
  schema_version: '1.0';
  guild: 'writers';
  emitted_at: string;
}

export interface LoreHandoffMessage extends MessageEnvelope {
  kind: 'lore_handoff';
  work_id: string;
  state: 'published';
}

export interface CommissionAttributionMessage extends MessageEnvelope {
  kind: 'commission_attribution';
  work_id: string;
  attribution: 'writers';
}

export interface SubguildStatusMessage extends MessageEnvelope {
  kind: 'subguild_status';
  activity_level: number;
  open_quests: number;
  champion_state: ChampionState;
  structure_level: StructureLevel;
}

export type GuildCommsMessage =
  | LoreHandoffMessage
  | CommissionAttributionMessage
  | SubguildStatusMessage;

const PUBLIC_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class GuildCommsBridge {
  constructor(
    private readonly publisher: FloorEventPublisher,
    private readonly now: () => Date = () => new Date(),
    private readonly circuitBreaker?: CircuitBreaker,
  ) {}

  async publishLoreHandoff(workId: string): Promise<boolean> {
    if (!PUBLIC_ID.test(workId)) return false;
    return this.publish(GUILD_COMMS_SUBJECTS.creator, {
      ...this.envelope(),
      kind: 'lore_handoff',
      work_id: workId,
      state: 'published',
    });
  }

  async publishCommissionAttribution(workId: string): Promise<boolean> {
    if (!PUBLIC_ID.test(workId)) return false;
    return this.publish(GUILD_COMMS_SUBJECTS.finance, {
      ...this.envelope(),
      kind: 'commission_attribution',
      work_id: workId,
      attribution: 'writers',
    });
  }

  async publishUpwardStatus(
    status: Omit<SubguildStatusMessage, keyof MessageEnvelope | 'kind'>,
  ): Promise<boolean> {
    return this.publish(GUILD_COMMS_SUBJECTS.upwardStatus, {
      ...this.envelope(),
      kind: 'subguild_status',
      ...status,
    });
  }

  /** Register validated handlers for any of the three public contracts. */
  async subscribe(
    handlers: Partial<Record<keyof typeof GUILD_COMMS_SUBJECTS, (message: GuildCommsMessage) => void>>,
  ): Promise<() => void> {
    if (this.publisher.subscribe === undefined) return () => {};
    if (await this.circuitBreaker?.isOpen('guild-comms')) return () => {};
    const results = await Promise.allSettled(
      (Object.keys(handlers) as Array<keyof typeof GUILD_COMMS_SUBJECTS>).map((key) =>
        this.publisher.subscribe?.(GUILD_COMMS_SUBJECTS[key], async (payload) => {
          const message = this.parse(payload);
          if (message !== null) handlers[key]?.(message);
        }),
      ),
    );
    const unsubscribers = results.flatMap((result) => {
      if (result.status === 'fulfilled') return result.value === undefined ? [] : [result.value];
      this.warnUnavailable('subscription', result.reason);
      return [];
    });
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }

  private envelope(): MessageEnvelope {
    return { schema_version: '1.0', guild: 'writers', emitted_at: this.now().toISOString() };
  }

  private async publish(subject: string, message: GuildCommsMessage): Promise<boolean> {
    try {
      if (await this.circuitBreaker?.isOpen('guild-comms')) {
        return false;
      }
      await this.publisher.publish(subject, JSON.stringify(message));
      return this.publisher.available;
    } catch (error: unknown) {
      this.warnUnavailable(subject, error);
      return false;
    }
  }

  private warnUnavailable(subject: string, error: unknown): void {
    console.warn('writers_guild_comms_unavailable', {
      subject,
      error_name: error instanceof Error ? error.name : 'UnknownError',
    });
  }

  private parse(payload: string): GuildCommsMessage | null {
    try {
      const value = JSON.parse(payload) as Partial<GuildCommsMessage>;
      return value.schema_version === '1.0' && value.guild === 'writers' &&
        ['lore_handoff', 'commission_attribution', 'subguild_status'].includes(String(value.kind))
        ? (value as GuildCommsMessage)
        : null;
    } catch {
      return null;
    }
  }
}

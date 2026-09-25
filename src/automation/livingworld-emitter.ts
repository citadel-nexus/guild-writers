// ─── CGRF Header ──────────────────────────────
// File:        src/automation/livingworld-emitter.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/livingworld/contracts.ts, src/livingworld/state.ts, src/livingworld/progression.ts, nats
// EnumType:    Service
// EnumEdges:   CONSUMES src/livingworld/state.ts; CONSUMES src/livingworld/progression.ts; PRODUCES citadel.writers.activity; PRODUCES citadel.writers.quest; PRODUCES citadel.writers.champion
// DAG Node:    writers.livingworld.emitter
// Intent:      Publish real Writers floor transitions while keeping NATS failures non-fatal.
// ──────────────────────────────────────────────

import { connect, StringCodec, type NatsConnection } from 'nats';

import {
  WRITERS_CHAMPION,
  WRITERS_GUILD,
  WRITERS_SUBJECTS,
  type ActivityEvent,
  type ClientSurface,
  type ChampionEvent,
  type ChampionState,
  type QuestEvent,
  type WritersPartyFeed,
  type WritersRealmFeed,
} from '../livingworld/contracts.js';
import { LivingWorldState, type QuestChange } from '../livingworld/state.js';
import type { ProgressionMetrics, StructureLevel } from '../livingworld/progression.js';

export type LoreCompilationOutcome = 'success' | 'failure';

export interface FloorEventPublisher {
  readonly available: boolean;
  publish(subject: string, payload: string): Promise<void>;
  subscribe?(
    subject: string,
    handler: (payload: string) => Promise<void>,
  ): Promise<() => void>;
  close(): Promise<void>;
}

export interface FloorTelemetry {
  activityHeartbeat(level: number): void;
  questThroughput(state: QuestChange['state']): void;
  championTransition(previous: ChampionState, next: ChampionState): void;
  loreCompilation(outcome: LoreCompilationOutcome): void;
  eventPublishFailure(subject: string): void;
  trace<T>(
    operation: string,
    tags: Readonly<Record<string, string | number>>,
    callback: () => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}

export interface FloorHooks {
  activity(level: number, method: string): void;
  quest(change: QuestChange): void;
  champion(previous: ChampionState, next: ChampionState): void;
  loreCompilation(outcome: LoreCompilationOutcome): void;
  engagement(surface: ClientSurface): void;
  close(): Promise<void>;
}

export class NoopFloorHooks implements FloorHooks {
  activity(_level: number, _method: string): void {}
  quest(_change: QuestChange): void {}
  champion(_previous: ChampionState, _next: ChampionState): void {}
  loreCompilation(_outcome: LoreCompilationOutcome): void {}
  engagement(_surface: ClientSurface): void {}
  async close(): Promise<void> {}
}

class QuietPublisher implements FloorEventPublisher {
  readonly available = false;

  async publish(_subject: string, _payload: string): Promise<void> {}

  async subscribe(
    _subject: string,
    _handler: (payload: string) => Promise<void>,
  ): Promise<() => void> {
    return () => {};
  }

  async close(): Promise<void> {}
}

class NatsPublisher implements FloorEventPublisher {
  readonly available = true;
  private readonly codec = StringCodec();

  constructor(private readonly connection: NatsConnection) {}

  async publish(subject: string, payload: string): Promise<void> {
    this.connection.publish(subject, this.codec.encode(payload));
  }

  async subscribe(
    subject: string,
    handler: (payload: string) => Promise<void>,
  ): Promise<() => void> {
    const subscription = this.connection.subscribe(subject);
    void (async () => {
      for await (const message of subscription) {
        try {
          await handler(this.codec.decode(message.data));
        } catch (error: unknown) {
          console.warn('writers_nats_handler_failed', {
            subject,
            error_name: error instanceof Error ? error.name : 'UnknownError',
          });
        }
      }
    })();
    return () => subscription.unsubscribe();
  }

  async close(): Promise<void> {
    await this.connection.drain();
  }
}

function safeMethod(method: string | undefined): string {
  const normalized = method?.trim().replace(/[^A-Za-z0-9._:-]/g, '').slice(0, 64);
  return normalized === undefined || normalized.length === 0 ? 'source-unavailable' : normalized;
}

/** Connect to NATS when configured, otherwise return a quiet publisher. */
export async function connectFloorPublisher(
  natsUrl: string | undefined,
): Promise<FloorEventPublisher> {
  if (natsUrl === undefined || natsUrl.trim().length === 0) {
    return new QuietPublisher();
  }

  try {
    const connection = await connect({
      servers: natsUrl,
      timeout: 2_000,
      reconnect: true,
      maxReconnectAttempts: -1,
    });
    return new NatsPublisher(connection);
  } catch (error: unknown) {
    console.warn('writers_nats_unavailable', {
      error_name: error instanceof Error ? error.name : 'UnknownError',
    });
    return new QuietPublisher();
  }
}

export class LivingWorldFloor {
  constructor(
    private readonly state: LivingWorldState,
    private readonly publisher: FloorEventPublisher,
    private readonly telemetry: FloorTelemetry,
    private readonly now: () => Date = () => new Date(),
    private readonly hooks: FloorHooks = new NoopFloorHooks(),
  ) {}

  get natsAvailable(): boolean {
    return this.publisher.available;
  }

  /** Publish a source-derived activity heartbeat and update the realm feed. */
  async heartbeat(activityLevel: unknown, method?: string): Promise<WritersRealmFeed> {
    return this.telemetry.trace(
      'activity_heartbeat',
      { method: safeMethod(method) },
      async () => {
        const level = this.state.updateActivity(activityLevel);
        const event: ActivityEvent = {
          guild: WRITERS_GUILD,
          activity_level: level,
          method: safeMethod(method),
          observed_at: this.now().toISOString(),
        };
        this.telemetry.activityHeartbeat(level);
        this.runHook(() => this.hooks.activity(level, event.method));
        await this.publishSafely(WRITERS_SUBJECTS.activity, event);
        return this.state.realmFeed();
      },
    );
  }

  /** Publish a quest event only when validated public quest state changes. */
  async questChanged(change: QuestChange): Promise<WritersRealmFeed> {
    return this.telemetry.trace('quest_change', { state: change.state }, async () => {
      const result = this.state.updateQuest(change);
      if (result.changed && result.value !== null) {
        const event: QuestEvent = {
          guild: WRITERS_GUILD,
          quest: result.value,
          observed_at: this.now().toISOString(),
        };
        this.telemetry.questThroughput(result.value.state);
        this.runHook(() => this.hooks.quest(result.value as QuestChange));
        await this.publishSafely(WRITERS_SUBJECTS.quest, event);
      }
      return this.state.realmFeed();
    });
  }

  /** Publish Quill's state only when the champion state changes. */
  async championChanged(state: unknown): Promise<WritersPartyFeed> {
    const previous = this.state.partyFeed().party[0]?.state ?? 'idle';
    return this.telemetry.trace('champion_change', {}, async () => {
      const result = this.state.updateChampion(state);
      if (result.changed) {
        const event: ChampionEvent = {
          guild: WRITERS_GUILD,
          champion: WRITERS_CHAMPION,
          state: result.value,
          observed_at: this.now().toISOString(),
        };
        this.telemetry.championTransition(previous, result.value);
        this.runHook(() => this.hooks.champion(previous, result.value));
        await this.publishSafely(WRITERS_SUBJECTS.champion, event);
      }
      return this.state.partyFeed();
    });
  }

  /** Record a real lore compiler completion for Datadog rate calculation. */
  recordLoreCompilation(outcome: LoreCompilationOutcome): void {
    this.telemetry.loreCompilation(outcome);
    this.runHook(() => this.hooks.loreCompilation(outcome));
  }

  /** Record a privacy-safe realm or mobile engagement signal. */
  recordEngagement(surface: ClientSurface): void {
    this.runHook(() => this.hooks.engagement(surface));
  }

  /** Apply real progression counters and return the resulting structure level. */
  updateProgression(metrics: Partial<ProgressionMetrics>): StructureLevel {
    return this.state.updateProgression(metrics).value;
  }

  /** Return the counters currently driving progression. */
  progressionMetrics(): ProgressionMetrics {
    return this.state.progressionMetrics();
  }

  /** Return the current public realm feed. */
  realmFeed(): WritersRealmFeed {
    return this.state.realmFeed();
  }

  /** Return the current public Quill party binding. */
  partyFeed(): WritersPartyFeed {
    return this.state.partyFeed();
  }

  /** Drain integrations during shutdown. */
  async close(): Promise<void> {
    await Promise.allSettled([
      this.publisher.close(),
      this.telemetry.close(),
      this.hooks.close(),
    ]);
  }

  private async publishSafely(subject: string, event: object): Promise<void> {
    try {
      await this.publisher.publish(subject, JSON.stringify(event));
    } catch (error: unknown) {
      this.telemetry.eventPublishFailure(subject);
      console.warn('writers_floor_event_publish_failed', {
        subject,
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  private runHook(callback: () => void): void {
    try {
      callback();
    } catch (error: unknown) {
      console.warn('writers_floor_hook_failed', {
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
}

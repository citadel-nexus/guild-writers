// ─── CGRF Header ──────────────────────────────
// File:        test/livingworld.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/automation/livingworld-emitter.ts, src/livingworld/state.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/automation/livingworld-emitter.ts; VALIDATES src/livingworld/state.ts
// DAG Node:    writers.test.livingworld
// Intent:      Prove floor state and events reflect validated inputs and remain quiet on unavailable sources.
// ──────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  connectFloorPublisher,
  LivingWorldFloor,
  type FloorEventPublisher,
  type FloorTelemetry,
  type LoreCompilationOutcome,
} from '../src/automation/livingworld-emitter.js';
import {
  WRITERS_SUBJECTS,
  type ChampionState,
  type QuestState,
} from '../src/livingworld/contracts.js';
import { LivingWorldState } from '../src/livingworld/state.js';

class RecordingPublisher implements FloorEventPublisher {
  readonly available = true;
  readonly events: Array<{ subject: string; payload: object }> = [];
  shouldFail = false;

  async publish(subject: string, payload: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('unavailable');
    }
    this.events.push({ subject, payload: JSON.parse(payload) as object });
  }

  async close(): Promise<void> {}
}

class RecordingTelemetry implements FloorTelemetry {
  readonly activities: number[] = [];
  readonly quests: QuestState[] = [];
  readonly championTransitions: Array<[ChampionState, ChampionState]> = [];
  readonly loreOutcomes: LoreCompilationOutcome[] = [];
  readonly publishFailures: string[] = [];
  readonly traces: string[] = [];

  activityHeartbeat(level: number): void {
    this.activities.push(level);
  }

  questThroughput(state: QuestState): void {
    this.quests.push(state);
  }

  championTransition(previous: ChampionState, next: ChampionState): void {
    this.championTransitions.push([previous, next]);
  }

  loreCompilation(outcome: LoreCompilationOutcome): void {
    this.loreOutcomes.push(outcome);
  }

  eventPublishFailure(subject: string): void {
    this.publishFailures.push(subject);
  }

  async trace<T>(
    operation: string,
    _tags: Readonly<Record<string, string | number>>,
    callback: () => Promise<T>,
  ): Promise<T> {
    this.traces.push(operation);
    return callback();
  }

  async close(): Promise<void> {}
}

function createFloor(): {
  floor: LivingWorldFloor;
  publisher: RecordingPublisher;
  telemetry: RecordingTelemetry;
} {
  const publisher = new RecordingPublisher();
  const telemetry = new RecordingTelemetry();
  const floor = new LivingWorldFloor(
    new LivingWorldState(),
    publisher,
    telemetry,
    () => new Date('2026-09-25T12:00:00.000Z'),
  );
  return { floor, publisher, telemetry };
}

describe('LivingWorldFloor', () => {
  it('starts as a quiet floor with Quill bound as guildmaster', () => {
    const { floor } = createFloor();

    expect(floor.realmFeed()).toEqual({
      guild: 'writers',
      champion: 'Quill',
      activity_level: 0,
      quests: [],
      structures: [{ kind: 'hall', level: 1 }],
    });
    expect(floor.partyFeed().party[0]).toMatchObject({
      id: 'quill',
      name: 'Quill',
      role: 'guildmaster',
      state: 'idle',
    });
  });

  it('publishes a source-derived activity heartbeat', async () => {
    const { floor, publisher, telemetry } = createFloor();

    const realm = await floor.heartbeat(0.72, 'lore-compiler');

    expect(realm.activity_level).toBe(0.72);
    expect(telemetry.activities).toEqual([0.72]);
    expect(publisher.events).toEqual([
      {
        subject: WRITERS_SUBJECTS.activity,
        payload: {
          guild: 'writers',
          activity_level: 0.72,
          method: 'lore-compiler',
          observed_at: '2026-09-25T12:00:00.000Z',
        },
      },
    ]);
  });

  it('falls back to quiet activity when the source value is missing', async () => {
    const { floor, publisher } = createFloor();

    await floor.heartbeat(0.8, 'source');
    const realm = await floor.heartbeat(undefined);
    await floor.heartbeat(2, 'over-range');
    await floor.heartbeat(-1, 'under-range');
    await floor.heartbeat(0.1, ' ### ');

    expect(realm.activity_level).toBe(0);
    expect(publisher.events.at(-1)?.payload).toMatchObject({
      method: 'source-unavailable',
    });
  });

  it('publishes only real quest state changes and rejects unsafe quest ids', async () => {
    const { floor, publisher, telemetry } = createFloor();
    const opened = { id: 'q1', title: '  Draft the realm brief  ', state: 'open' as const };

    await floor.questChanged(opened);
    await floor.questChanged(opened);
    await floor.questChanged({ ...opened, state: 'closed' });
    await floor.questChanged({ id: '../private', title: 'No', state: 'open' });
    await floor.questChanged({ id: 'q2', title: '\u0000\n', state: 'open' });

    expect(publisher.events.map((event) => event.subject)).toEqual([
      WRITERS_SUBJECTS.quest,
      WRITERS_SUBJECTS.quest,
    ]);
    expect(telemetry.quests).toEqual(['open', 'closed']);
    expect(floor.realmFeed().quests).toEqual([
      { id: 'q1', title: 'Draft the realm brief', state: 'closed' },
    ]);
  });

  it('publishes Quill state transitions and records lore compiler outcomes', async () => {
    const { floor, publisher, telemetry } = createFloor();

    await floor.championChanged('working');
    await floor.championChanged('working');
    await floor.championChanged('blocked');
    await floor.championChanged('invalid');
    floor.recordLoreCompilation('success');

    expect(publisher.events.map((event) => event.subject)).toEqual([
      WRITERS_SUBJECTS.champion,
      WRITERS_SUBJECTS.champion,
      WRITERS_SUBJECTS.champion,
    ]);
    expect(telemetry.championTransitions).toEqual([
      ['idle', 'working'],
      ['working', 'blocked'],
      ['blocked', 'idle'],
    ]);
    expect(telemetry.loreOutcomes).toEqual(['success']);
    expect(floor.partyFeed().party[0]?.state).toBe('idle');
  });

  it('retains local public state when event publication fails', async () => {
    const { floor, publisher, telemetry } = createFloor();
    publisher.shouldFail = true;

    const realm = await floor.heartbeat(0.4, 'real-source');

    expect(realm.activity_level).toBe(0.4);
    expect(telemetry.publishFailures).toEqual([WRITERS_SUBJECTS.activity]);
  });

  it('returns a quiet publisher when NATS is not configured', async () => {
    const publisher = await connectFloorPublisher(undefined);
    const whitespacePublisher = await connectFloorPublisher('   ');

    expect(publisher.available).toBe(false);
    expect(whitespacePublisher.available).toBe(false);
    await expect(publisher.publish('ignored', '{}')).resolves.toBeUndefined();
    await expect(publisher.close()).resolves.toBeUndefined();
  });

  it('closes publisher and telemetry without propagating failures', async () => {
    const { floor } = createFloor();
    await expect(floor.close()).resolves.toBeUndefined();
  });
});

// ─── CGRF Header ──────────────────────────────
// File:        src/telemetry/datadog.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     dd-trace, hot-shots, src/automation/livingworld-emitter.ts
// EnumType:    Adapter
// EnumEdges:   CONSUMES src/automation/livingworld-emitter.ts; PRODUCES guild-mcp-quill
// DAG Node:    writers.telemetry.datadog
// Intent:      Trace floor operations and report source-derived Writers metrics without blocking service work.
// ──────────────────────────────────────────────

import tracer from 'dd-trace';
import { StatsD } from 'hot-shots';

import type {
  FloorTelemetry,
  LoreCompilationOutcome,
} from '../automation/livingworld-emitter.js';
import type { ChampionState, QuestState } from '../livingworld/contracts.js';

const SERVICE = 'guild-mcp-quill';
const BASE_TAGS = [
  `service:${SERVICE}`,
  'seat:quill',
  'guild:writers',
  'srs_code:SRS-CN-WRITERS-LIVINGWORLD-001',
  'dispatch_id:DISP-LIVINGWORLD-writers',
];

export class NoopFloorTelemetry implements FloorTelemetry {
  activityHeartbeat(_level: number): void {}

  questThroughput(_state: QuestState): void {}

  championTransition(_previous: ChampionState, _next: ChampionState): void {}

  loreCompilation(_outcome: LoreCompilationOutcome): void {}

  eventPublishFailure(_subject: string): void {}

  async trace<T>(
    _operation: string,
    _tags: Readonly<Record<string, string | number>>,
    callback: () => Promise<T>,
  ): Promise<T> {
    return callback();
  }

  async close(): Promise<void> {}
}

class DatadogFloorTelemetry implements FloorTelemetry {
  constructor(private readonly metrics: StatsD) {}

  activityHeartbeat(level: number): void {
    this.record(() => this.metrics.gauge('writers.floor.activity_level', level));
  }

  questThroughput(state: QuestState): void {
    this.record(() =>
      this.metrics.increment('writers.floor.quest.throughput', 1, 1, [`state:${state}`]),
    );
  }

  championTransition(previous: ChampionState, next: ChampionState): void {
    this.record(() =>
      this.metrics.increment('writers.floor.champion.state_transition', 1, 1, [
        `from:${previous}`,
        `to:${next}`,
      ]),
    );
  }

  loreCompilation(outcome: LoreCompilationOutcome): void {
    this.record(() =>
      this.metrics.increment('writers.lore.compilation', 1, 1, [`outcome:${outcome}`]),
    );
  }

  eventPublishFailure(subject: string): void {
    this.record(() =>
      this.metrics.increment('writers.floor.event.publish_failure', 1, 1, [
        `subject:${subject}`,
      ]),
    );
  }

  async trace<T>(
    operation: string,
    tags: Readonly<Record<string, string | number>>,
    callback: () => Promise<T>,
  ): Promise<T> {
    return tracer.trace(
      `writers.floor.${operation}`,
      {
        service: SERVICE,
        resource: operation,
        tags: {
          ...tags,
          srs_code: 'SRS-CN-WRITERS-LIVINGWORLD-001',
          seat: 'quill',
          dispatch_id: 'DISP-LIVINGWORLD-writers',
        },
      },
      callback,
    );
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.metrics.close(() => resolve());
    });
  }

  private record(callback: () => void): void {
    try {
      callback();
    } catch (error: unknown) {
      console.warn('writers_metric_record_failed', {
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
}

/** Create an active DogStatsD adapter only when a Datadog agent is configured. */
export function createFloorTelemetry(
  environment: NodeJS.ProcessEnv = process.env,
  client?: StatsD,
): FloorTelemetry {
  const host = environment.DD_AGENT_HOST?.trim();
  if (host === undefined || host.length === 0) {
    return new NoopFloorTelemetry();
  }

  const configuredPort = Number(environment.DD_DOGSTATSD_PORT);
  const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 8125;
  const metrics =
    client ??
    new StatsD({
      host,
      port,
      prefix: '',
      globalTags: BASE_TAGS,
      errorHandler: (error: Error) => {
        console.warn('writers_metric_transport_failed', { error_name: error.name });
      },
    });
  return new DatadogFloorTelemetry(metrics);
}

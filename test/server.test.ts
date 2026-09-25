// ─── CGRF Header ──────────────────────────────
// File:        test/server.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/server.ts, src/routes/realm.ts, src/routes/party.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/server.ts; VALIDATES src/routes/realm.ts; VALIDATES src/routes/party.ts
// DAG Node:    writers.test.http
// Intent:      Verify the public realm and Quill party contracts over their exact HTTP paths.
// ──────────────────────────────────────────────

import type {
  IncomingHttpHeaders,
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse,
} from 'node:http';

import { describe, expect, it } from 'vitest';

import {
  LivingWorldFloor,
  type FloorEventPublisher,
  type FloorTelemetry,
} from '../src/automation/livingworld-emitter.js';
import { LivingWorldState } from '../src/livingworld/state.js';
import { createWritersRequestHandler } from '../src/server.js';

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
  ): Promise<T> {
    return callback();
  },
  async close(): Promise<void> {},
};

interface MemoryResult {
  status: number;
  headers: OutgoingHttpHeaders;
  body: Record<string, unknown>;
}

class MemoryResponse {
  headersSent = false;
  private status = 0;
  private headers: OutgoingHttpHeaders = {};

  constructor(private readonly resolve: (result: MemoryResult) => void) {}

  writeHead(status: number, headers: OutgoingHttpHeaders): this {
    this.status = status;
    this.headers = headers;
    this.headersSent = true;
    return this;
  }

  end(chunk?: string): this {
    this.resolve({
      status: this.status,
      headers: this.headers,
      body: chunk === undefined ? {} : (JSON.parse(chunk) as Record<string, unknown>),
    });
    return this;
  }
}

async function makeRequest(
  method: string,
  url: string,
  floor: LivingWorldFloor = new LivingWorldFloor(new LivingWorldState(), publisher, telemetry),
): Promise<MemoryResult> {
  const handler = createWritersRequestHandler(floor);
  return new Promise<MemoryResult>((resolve) => {
    const request = { method, url, headers: {} as IncomingHttpHeaders } as IncomingMessage;
    const response = new MemoryResponse(resolve) as unknown as ServerResponse;
    handler(request, response);
  });
}

describe('Writers public HTTP service', () => {
  it('serves the quiet Writers realm feed', async () => {
    const response = await makeRequest('GET', '/realm/writers.json');

    expect(response.status).toBe(200);
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(response.body).toEqual({
      guild: 'writers',
      champion: 'Quill',
      activity_level: 0,
      quests: [],
      structures: [{ kind: 'hall', level: 1 }],
    });
  });

  it('binds Quill in the game party feed', async () => {
    const response = await makeRequest('GET', '/game/party.json');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      guild: 'writers',
      party: [
        {
          id: 'quill',
          name: 'Quill',
          role: 'guildmaster',
          guild: 'writers',
          floor: 'writers',
          state: 'idle',
        },
      ],
    });
  });

  it('reports quiet degraded health without connection details', async () => {
    const response = await makeRequest('GET', '/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      guild: 'writers',
      status: 'degraded',
      mode: 'quiet',
      nats_prefix: 'citadel.writers.*',
    });
    expect(JSON.stringify(response.body)).not.toContain('NATS_URL');
  });

  it('reports live healthy mode when NATS is available', async () => {
    const livePublisher = { ...publisher, available: true };
    const floor = new LivingWorldFloor(new LivingWorldState(), livePublisher, telemetry);
    const response = await makeRequest('GET', '/health', floor);

    expect(response.body).toMatchObject({ status: 'healthy', mode: 'live' });
  });

  it('returns quiet public feeds when a route dependency throws', async () => {
    const failingFloor = {
      natsAvailable: false,
      realmFeed(): never {
        throw new Error('unavailable');
      },
      partyFeed(): never {
        throw new Error('unavailable');
      },
    } as unknown as LivingWorldFloor;

    const realm = await makeRequest('GET', '/realm/writers.json', failingFloor);
    const party = await makeRequest('GET', '/game/party.json', failingFloor);

    expect(realm.status).toBe(200);
    expect(realm.body).toMatchObject({ activity_level: 0, quests: [] });
    expect(party.status).toBe(200);
    expect(party.body).toMatchObject({ guild: 'writers' });
  });

  it('returns unavailable health when its dependency fails', async () => {
    const failingFloor = Object.create(null) as LivingWorldFloor;
    Object.defineProperty(failingFloor, 'natsAvailable', {
      get(): never {
        throw new Error('unavailable');
      },
    });

    const response = await makeRequest('GET', '/health', failingFloor);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'temporarily_unavailable' });
  });

  it('rejects writes and unknown routes', async () => {
    const writeResponse = await makeRequest('POST', '/realm/writers.json');
    const missingResponse = await makeRequest('GET', '/unknown');

    expect(writeResponse.status).toBe(405);
    expect(missingResponse.status).toBe(404);
  });
});

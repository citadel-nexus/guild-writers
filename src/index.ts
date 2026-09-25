// ─── CGRF Header ──────────────────────────────
// File:        src/index.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/server.ts, src/automation/livingworld-emitter.ts, src/telemetry/datadog.ts
// EnumType:    Service
// EnumEdges:   CONSUMES src/server.ts; CONSUMES src/automation/livingworld-emitter.ts; CONSUMES src/telemetry/datadog.ts
// DAG Node:    writers.service.entrypoint
// Intent:      Start the public Writers floor service with fail-soft NATS and Datadog integrations.
// ──────────────────────────────────────────────

import 'dd-trace/init';

import { createServer } from 'node:http';

import {
  connectFloorPublisher,
  LivingWorldFloor,
} from './automation/livingworld-emitter.js';
import { LivingWorldState } from './livingworld/state.js';
import { createWritersRequestHandler } from './server.js';
import { createFloorTelemetry } from './telemetry/datadog.js';

const DEFAULT_PORT = 8200;

function servicePort(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : DEFAULT_PORT;
}

async function main(): Promise<void> {
  const telemetry = createFloorTelemetry();
  const publisher = await connectFloorPublisher(process.env.NATS_URL);
  const floor = new LivingWorldFloor(new LivingWorldState(), publisher, telemetry);
  const server = createServer(createWritersRequestHandler(floor));
  const port = servicePort(process.env.PORT);

  server.listen(port, () => {
    console.info('writers_service_started', {
      port,
      mode: floor.natsAvailable ? 'live' : 'quiet',
      service: 'guild-mcp-quill',
    });
  });

  const shutdown = (): void => {
    server.close(() => {
      void floor.close().finally(() => {
        process.exitCode = 0;
      });
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void main().catch((error: unknown) => {
  console.error('writers_service_start_failed', {
    error_name: error instanceof Error ? error.name : 'UnknownError',
  });
  process.exitCode = 1;
});

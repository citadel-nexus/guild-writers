// ─── CGRF Header ──────────────────────────────
// File:        src/server.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/routes/health.ts, src/routes/realm.ts, src/routes/party.ts, src/routes/n8n.ts
// EnumType:    Service
// EnumEdges:   CONSUMES src/routes/health.ts; CONSUMES src/routes/realm.ts; CONSUMES src/routes/party.ts; CONSUMES src/routes/n8n.ts
// DAG Node:    writers.http.server
// Intent:      Serve only the public GET contracts required by the Writers living-world floor.
// ─────────────────────────────────────────────

import type { IncomingMessage, ServerResponse } from 'node:http';

import type { LivingWorldFloor } from './automation/livingworld-emitter.js';
import { LivingWorldState } from './livingworld/state.js';
import { healthCheck } from './routes/health.js';
import type { N8nWebhookHandler } from './routes/n8n.js';
import { getWritersParty } from './routes/party.js';
import { getWritersRealm } from './routes/realm.js';

const QUIET_STATE = new LivingWorldState();
const MAX_WEBHOOK_BYTES = 64 * 1024;

export interface WritersServerOptions {
  n8n?: N8nWebhookHandler;
}

function writeJson(response: ServerResponse, status: number, body: object): void {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  floor: LivingWorldFloor,
  options: WritersServerOptions,
): Promise<void> {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', 'http://writers.invalid');

  if (url.pathname === '/webhooks/n8n' && method === 'POST') {
    if (options.n8n === undefined) {
      writeJson(response, 503, { error: 'webhook_not_configured' });
      return;
    }
    const result = await options.n8n.handle(await readBody(request), request.headers);
    writeJson(response, result.status, result.body);
    return;
  }

  if (method !== 'GET') {
    writeJson(response, 405, { error: 'method_not_allowed' });
    return;
  }

  if (url.pathname === '/realm/writers.json') {
    floor.recordEngagement(request.headers['x-citadel-client'] === 'mobile' ? 'mobile' : 'realm');
    writeJson(response, 200, getWritersRealm(floor));
    return;
  }

  if (url.pathname === '/game/party.json') {
    writeJson(response, 200, getWritersParty(floor));
    return;
  }

  if (url.pathname === '/health') {
    writeJson(response, 200, healthCheck(floor.natsAvailable));
    return;
  }

  writeJson(response, 404, { error: 'not_found' });
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > MAX_WEBHOOK_BYTES) throw new Error('WebhookBodyTooLarge');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Create a fail-soft request handler for the public Writers routes. */
export function createWritersRequestHandler(
  floor: LivingWorldFloor,
  options: WritersServerOptions = {},
): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    void handleRequest(request, response, floor, options).catch((error: unknown) => {
      console.error('writers_request_failed', {
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
      if (!response.headersSent) {
        const path = new URL(request.url ?? '/', 'http://writers.invalid').pathname;
        if (path === '/game/party.json') {
          writeJson(response, 200, QUIET_STATE.partyFeed());
          return;
        }
        if (path === '/realm/writers.json') {
          writeJson(response, 200, QUIET_STATE.realmFeed());
          return;
        }
        writeJson(response, 503, { error: 'temporarily_unavailable' });
      } else {
        response.end();
      }
    });
  };
}

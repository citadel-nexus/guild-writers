# ─── CGRF Header ──────────────────────────────
# File:        .bits/integration-checklist.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-LIVINGWORLD-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     src/integrations/coordinator.ts, .env.example
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON src/integrations/coordinator.ts; DEPENDS_ON .env.example
# DAG Node:    writers.integration.checklist
# Intent:      Make every external dependency, runtime prerequisite, health check, and fallback explicit.
# ──────────────────────────────────────────────

# Writers Guild integration checklist

Statuses reflect repository/runtime readiness, not fabricated live connectivity. Every
integration remains **pending** until its deployment supplies the required environment
values and passes the listed health check.

| System | Status | Required environment | Health check | Fail-soft behavior |
|---|---|---|---|---|
| NATS floor events | pending | `NATS_URL` | Publish and observe `citadel.writers.activity` | Retain local public state; no crash |
| Datadog APM + metrics | pending | `DD_AGENT_HOST`, `DD_DOGSTATSD_PORT`, standard `DD_*` tags | Observe `guild-mcp-quill` trace and `writers.floor.activity_level` | No-op telemetry adapter |
| Datadog mobile RUM | pending | `DD_RUM_APPLICATION_ID`, `DD_RUM_CLIENT_TOKEN`, `APP_VERSION` | Start SDK and observe a mobile vital | SDK remains disabled |
| PostHog | pending | `POSTHOG_API_KEY`, `POSTHOG_HOST` | Capture `writers_realm_feed_viewed`; evaluate each `writers-circuit-break-*` flag | No-op analytics; circuits default open-for-service |
| Customer.io | pending | `CUSTOMERIO_*` API, HMAC, and broadcast values | Segment a test member and trigger configured test broadcasts | No notification; floor event continues |
| Private GitLab metadata | pending | `GITLAB_BASE_URL`, `GITLAB_PROJECT_ID`, `GITLAB_READ_TOKEN`, `GITLAB_LORE_PATH`, `SOURCE_ID_HMAC_KEY` | Read pipeline/MR/commit metadata with a read-only token | Quiet GitLab snapshot; no private payload emitted |
| Supabase lore counts | pending | `SUPABASE_URL`, `SUPABASE_READ_KEY` | Count `lore_entries` and `rpg_sessions`; receive a test realtime change | Quiet Supabase snapshot; subscription is optional |
| n8n webhook | pending | `N8N_WEBHOOK_SECRET` | Send a timestamped signed event to `POST /webhooks/n8n` | `503` when unconfigured; `401` for invalid HMAC |
| Creator lore handoff | pending | `NATS_URL` | Observe `citadel.guild.comms.writers→creator` | Drop message after structured warning |
| Finance attribution | pending | `NATS_URL` | Observe `citadel.guild.comms.writers→finance` | Drop message after structured warning |
| Creator upward status | pending | `NATS_URL` | Observe `citadel.creator.subguild.writers.status` | Floor continues without reporting |

## Public-safe boundary

- GitLab returns only activity ratios, generic quest labels, enumerated states, and
  HMAC-derived identifiers. Project paths, authors, titles, and file contents stay private.
- Supabase queries use count-only selects. Realtime callbacks ignore row payloads and
  refresh aggregate counts.
- Customer.io receives HMAC-derived member identifiers and coarse activity bands.
- PostHog receives guild-level events only; it receives no person or tenant identifier.
- n8n bodies must pass timestamped SHA-256 HMAC validation before parsing or dispatch.
- PostHog circuit flags gate GitLab, Supabase, Customer.io, n8n, and cross-guild NATS work
  independently; an unavailable flag service leaves the core floor available.

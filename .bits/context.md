# ─── CGRF Header ──────────────────────────────
# File:        .bits/context.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-LIVINGWORLD-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     AGENTS.md, CLAUDE.md
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON AGENTS.md; DEPENDS_ON CLAUDE.md; GATES SRS-CN-WRITERS-LIVINGWORLD-001
# DAG Node:    none
# Intent:      Bound the active Writers Guild sprint to public-safe living-world implementation work.
# ──────────────────────────────────────────────

# Active sprint context

Sprint: Living-World Floor. Phase: BUILD.
Do: `src/`, NATS events, realm feed, champion binding, mobile app.
Don't: modify `.github/workflows/`, `docker/`.

## Pre-flight order

1. [AGENTS.md](../AGENTS.md) — machine-facing repo contract
2. [CLAUDE.md](../CLAUDE.md) — human-facing context
3. `.bits/context.md` — this file
4. `.bits/srs_registry.yml` — SRS codes you may commit under
5. `.bits/srs/<SRS>.md` — full spec for the SRS code
6. `.bits/queue/<DISPATCH_ID>.md` — your task table

## Do

- `src/` — living-world floor service, routes, NATS emitters
- Mobile app surfaces
- Tests
- Docs and `.bits/` governance scaffolding

## Don't

- `.github/workflows/**` — CI is pre-configured
- `docker/**` — deployment config is pre-configured

## Conventions

- Branch: `bits/<SRS-CODE>-<slug>`
- Commit footer carries `SRS:` and `Dispatch:`
- One PR per SRS code
- TypeScript only
- Entity is **Citadel Nexus Inc.** — never "LLC"

---
© 2026 Citadel Nexus Inc.

# ─── CGRF Header ──────────────────────────────
# File:        CLAUDE.md
# Stage:       04_HYPOTHESIZE
# SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-LIVINGWORLD-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     AGENTS.md
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON AGENTS.md; GATES .bits/context.md
# DAG Node:    none
# Intent:      Give human operators the Writers Guild context needed to govern living-world work.
# ──────────────────────────────────────────────

# CLAUDE.md — guild-writers

Human-facing companion to [AGENTS.md](./AGENTS.md).

## Purpose

Writers Guild public living-world service for Citadel Nexus:

- **Lore engine** — compile RPG sessions into canonical lore entries
- **World bible** — factions, history, geography, characters
- **Realm feed** — public `/realm/writers.json` the Aincrad game reads
- **NATS events** — `citadel.writers.*` floor telemetry

Champion: **Quill** (The Quill and Scroll). Color: Warm Amber `#D4860B`.

## Stack canon

| Layer | Choice |
|---|---|
| Language | TypeScript (Node.js) |
| Package manager | npm |
| NATS prefix | `citadel.writers.*` |
| Port | 8200 |
| Owner | Citadel Nexus Inc. (Delaware C-Corp) |

## Dispatch requirement

Every change needs a dispatch: in the branch name (`bits/<SRS>-<slug>`),
the commit footer (`SRS:` + `Dispatch:`), and the PR title. Check
`.bits/queue/` for the active dispatch. No dispatch, no commit.

## Bootstrap exception

This file is created under the governance bootstrap. The circular-dependency
exception is active: governance files cannot require themselves to pre-exist.
It closes now that AGENTS.md, CLAUDE.md, and .bits/context.md exist.

## Hard NO

- Never expose secrets — no keys, tokens, or credentials in code or PRs.
- Never push directly to `main`. Feature branch → PR only.
- Never write "Citadel Nexus LLC". The entity is **Citadel Nexus Inc.**
- Never fabricate data — activity levels, quest states, revenue all reflect real sources.
- PUBLIC-SAFE — no private paths, IPs, secrets, or tenant material.

---
© 2026 Citadel Nexus Inc.

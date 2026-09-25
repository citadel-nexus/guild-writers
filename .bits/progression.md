# ─── CGRF Header ──────────────────────────────
# File:        .bits/progression.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-LIVINGWORLD-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     src/livingworld/progression.ts, src/integrations/coordinator.ts
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON src/livingworld/progression.ts; DEPENDS_ON src/integrations/coordinator.ts
# DAG Node:    writers.livingworld.progression_policy
# Intent:      Define auditable level thresholds that structures reach only from real guild outcomes.
# ──────────────────────────────────────────────

# Writers Guild floor progression

The hall starts at level 1. Advancement requires **all three** thresholds for a level;
there are no synthetic boosts, manual multipliers, or projected values.

| Level reached | Published lore entries | Completed quests | Quill uptime |
|---|---:|---:|---:|
| 1 | 0 | 0 | 0% |
| 2 | 25 | 10 | 95% |
| 3 | 100 | 50 | 97% |
| 4 | 250 | 125 | 98% |
| 5 | 500 | 250 | 99% |

## Metric provenance

- **Published lore entries**: count-only `lore_entries` result from the authorized
  Supabase read adapter.
- **Completed quests**: compiled `rpg_sessions` count, supplemented by sanitized closed
  merge-request signals where an authorized workflow provides cumulative totals.
- **Quill uptime**: externally observed champion availability over the deployment's
  reporting window. It may enter through the HMAC-authenticated n8n progression event.

Missing or invalid values normalize to zero. A floor never advances from an unavailable
source. During a process lifetime, the coordinator retains the highest verified cumulative
counters seen from each source; a fresh process derives its level only from currently
available verified snapshots.

## Structures

- Level 1: Quill and Scroll Hall
- Level 2: Scriptorium wing
- Level 3: Public archive stacks
- Level 4: Chronicle observatory
- Level 5: Living World Library

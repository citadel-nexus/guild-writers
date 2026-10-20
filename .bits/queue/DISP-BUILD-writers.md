# ─── CGRF Header ──────────────────────────────
# File:         .bits/queue/DISP-BUILD-writers.md
# Stage:        11_COMMIT
# SRS:          SRS-CN-WRITERS-BUILD-001
# CAPS:         pending
# CK:           pending
# Dispatch:     DISP-BUILD-writers
# Seat:         BITS-CODEGEN
# Owner:        Citadel Nexus Inc.
# Created:      2026-10-20
# Depends:      SRS-CN-WRITERS-BUILD-001, .bits/srs/SRS-CN-WRITERS-BUILD-001.md
# EnumType:     ConfigDoc
# EnumEdges:    GATES SRS-CN-WRITERS-BUILD-001; DEPENDS_ON .bits/srs/SRS-CN-WRITERS-BUILD-001.md
# DAG Node:     none
# Intent:       Make the Writers build reproducible and verifiable before staging review.
# ──────────────────────────────────────────────

# DISP-BUILD-writers

- srs: SRS-CN-WRITERS-BUILD-001
- guild: writers
- seat: BITS-CODEGEN
- status: in_progress
- mode: staging
- base: main (258fc755aecea9284a24530f99534fbe2943b451)
- branch: bits/SRS-CN-WRITERS-BUILD-001-build-repair
- authority: Dmitry Richard, current operator directive

| Phase | Task | Gate |
|---|---|---|
| A | Repair Node, TypeScript, ESLint, state inference and Docker | Offline config and state regression checks |
| B | Add manual lockfile refresh and guarded provenance verification | Workflow policy and packaging rejection tests |
| C | Document prerequisites and report evidence | npm result table, CGRF and memory audit |

Smoke commands (registry-dependent failures remain blockers):

```bash
npm ci --offline --ignore-scripts --no-audit --no-fund
npm run lint
npm run typecheck
npm test
npm run build
node --test test/build-provenance.check.mjs
```

Memory Brief: the prior session's repairs were never published because it
remained bound to a merged governance PR. Registry metadata is unavailable
in this sandbox. Preserve real lockfile data and use an operator-triggered
GitHub workflow to regenerate it. This checkout contains no prior provenance
or GOVERNANCE files; create the scoped build controls and documentation here.

Repository-local dispatch only: no external VCC database status was changed.

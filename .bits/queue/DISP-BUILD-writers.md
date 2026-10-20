<!--
# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/queue/DISP-BUILD-writers.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-WRITERS-BUILD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-BUILD-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .bits/srs/SRS-CN-WRITERS-BUILD-001.md
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON .bits/srs/SRS-CN-WRITERS-BUILD-001.md; GATES package.json
# DAG Node:    none
# Intent:      Record build-repair authority and measurable validation gates.
# ───────────────────────────────────────────────────────────────
-->

# DISP-BUILD-writers

status: in_progress
SRS: SRS-CN-WRITERS-BUILD-001
Seat: BITS-CODEGEN
Mode: staging
Branch: bits/SRS-CN-WRITERS-BUILD-001-build-repair
Base: origin/main at f7e5fd61c1f03959599f29c94d493c552b3d5365 (merged governance PR 20)

## Authorization source

Current operator directive from authenticated Dmitry Richard through Bits AI:
"AUTHORIZED build repair." Scope and bounds are recorded in the linked SRS.

## Phases

A. Register authorization and reproduce installation/configuration failures.
B. Repair lockfile, Node pinning, TypeScript and ESLint without weakening tests.
C. Repair CI and verify real compiled provenance inputs; retain security scanning.
D. Run checks and record evidence, blockers and memory for one separate PR.

Print PASS/FAIL gates and document failure causes. Do not claim blocked checks pass.

## Smoke commands

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Then run the provenance packaging step against real dist/src output and verify the
archive contains its compiled entrypoint and passes its checksum manifest.
Hosted signing requires a later trusted-main GitHub Actions run.

## Memory Brief

The previous dispatch could not install offline: npm reported missing optional
peer metadata and tsc/vitest were unavailable. Its governance and provenance
changes are merged in PR 20 and must not be reintroduced in this build-repair PR.
Operator confirmed ownership team @citadel-nexus/guild-writers and automation app
quill-writers-guildmaster. Preserve that mapping.

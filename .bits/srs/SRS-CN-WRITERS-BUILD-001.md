<!--
# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/srs/SRS-CN-WRITERS-BUILD-001.md
# Stage:       04_HYPOTHESIZE
# SRS:         SRS-CN-WRITERS-BUILD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-BUILD-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .bits/srs_registry.yml
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON .bits/srs_registry.yml; GATES package.json; GATES .github/workflows/ci.yml
# DAG Node:    none
# Intent:      Bound the operator-authorized build repair to reproducible validation and CI.
# ───────────────────────────────────────────────────────────────
-->

# Writers Guild build repair

SRS: SRS-CN-WRITERS-BUILD-001
Status: in_progress
Dispatch: DISP-BUILD-writers

## Authorization

Authenticated operator Dmitry Richard, seat BITS-CODEGEN, mode staging, explicitly
authorized creating these records and repairing installation, Node pinning,
TypeScript, ESLint, tests, CI expressions and real-build provenance. Container
build runtime and entrypoint corrections are included; no image is built or
published from this sandbox. This directive
supersedes older sprint restrictions on workflow and existing-header edits for
this scoped work. It does not authorize deployment, production operations, secrets,
GitHub settings changes or pushing to main. This local record does not claim an
external VCC update.

## Acceptance criteria

- npm ci succeeds with a consistent lockfile and pinned Node version shared by
  .nvmrc, package engines and CI.
- Lint, explicit typecheck, tests with existing coverage thresholds and build pass.
- Do not weaken/delete tests or strictness to conceal failures.
- Docker/GHCR login uses GitHub expressions; preserve CodeQL and secret scanning.
- Provenance attests an archive of the actual compiled output after validation.
- Record exact outcomes/blockers for npm ci, lint, typecheck, test and build.

Use one new branch and PR based on merged governance PR 20. No blueprint or CK
signature is generated. CKS gate B+/75; CKS, CAPS and CK remain pending.

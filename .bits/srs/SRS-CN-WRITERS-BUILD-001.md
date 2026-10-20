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

The initial build work was merged as PR 21. The operator authorizes continuation
on the bound publishing branch rebased onto current main, and the fixed
bits/lockfile-refresh branch for the manual automation PR. No blueprint or CK
signature is generated. CKS gate B+/75; CKS, CAPS and CK remain pending.

## Continuation acceptance criteria

- Manual-only, SHA-pinned lockfile refresh uses read-only install credentials,
  runs all five requested checks, then proposes only the generated lockfile on
  bits/lockfile-refresh with a separate, narrowly privileged publication job.
- Positive provenance verification succeeds; tampered bytes and a wrong signer
  must be rejected before the retained bundle is published as an artifact.
- BUILD.md explains registry auth, admin prerequisites, signed API commits,
  PR check-trigger limits and failures without creating secrets or changing settings.
- Rebase the bound local branch onto the current main; preserve already-published
  commits and report the actual ability/limits of external UI publication.

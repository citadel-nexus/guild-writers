# ─── CGRF Header ──────────────────────────────
# File:         .bits/srs/SRS-CN-WRITERS-BUILD-001.md
# Stage:        04_HYPOTHESIZE
# SRS:          SRS-CN-WRITERS-BUILD-001
# CAPS:         pending
# CK:           pending
# Dispatch:     DISP-BUILD-writers
# Seat:         BITS-CODEGEN
# Owner:        Citadel Nexus Inc.
# Created:      2026-10-20
# Depends:      SRS-CN-WRITERS-BUILD-001, .bits/srs_registry.yml
# EnumType:     Doc
# EnumEdges:    GATES SRS-CN-WRITERS-BUILD-001; DEPENDS_ON .bits/srs_registry.yml
# DAG Node:     none
# Intent:       Make the Writers build reproducible and verifiable before staging review.
# ──────────────────────────────────────────────

# SRS-CN-WRITERS-BUILD-001

Status: in_progress
Dispatch: DISP-BUILD-writers
Mode: staging
Authority: Dmitry Richard's operator directive in this session.

Repair the public TypeScript build on the supplied main snapshot. Pin Node,
separate lint/typecheck/build, preserve tests and all 80% coverage gates,
fix numeric activity inference, and align the container entrypoint.
Add a manual, authenticated lockfile refresh that validates before opening
a lockfile-only PR. Attest only clean, successful main builds and verify
artifact digest, repository, workflow identity, source ref and source SHA.
Tampered content and a wrong signer identity must be rejected.

Acceptance: all offline checks recorded; unavailable npm registry metadata
reported as blocked, never invented. Keep CodeQL and secret scanning.
Document admin prerequisites without changing settings or secrets.
One build repair branch/PR. The future lockfile-refresh PR is separate and
created only when an operator explicitly dispatches that workflow.
No production execution, deploy, main push, or direct memory ingestion.
CKS target: B+/75; CAPS minimum: pending operator verification.

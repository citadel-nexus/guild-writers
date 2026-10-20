# ─── CGRF Header ──────────────────────────────
# File:         GOVERNANCE.md
# Stage:        06_PLAN
# SRS:          SRS-CN-WRITERS-BUILD-001
# CAPS:         pending
# CK:           pending
# Dispatch:     DISP-BUILD-writers
# Seat:         BITS-CODEGEN
# Owner:        Citadel Nexus Inc.
# Created:      2026-10-20
# Depends:      SRS-CN-WRITERS-BUILD-001, PROVENANCE.md
# EnumType:     Doc
# EnumEdges:    GATES SRS-CN-WRITERS-BUILD-001; DEPENDS_ON PROVENANCE.md
# DAG Node:     none
# Intent:       Keep staging build recovery and signing authority bounded by reviewed repository controls.
# ──────────────────────────────────────────────

# Writers build governance

Owner: Citadel Nexus Inc.
Seat: BITS-CODEGEN
SRS: SRS-CN-WRITERS-BUILD-001
Dispatch: DISP-BUILD-writers (in_progress, staging)

The operator authorized repository-local SRS and dispatch creation for this
build repair. No external VCC database status was changed. Existing AGENTS.md,
CLAUDE.md and CODEOWNERS conventions continue to apply; the current directive
specifically authorizes the scoped CI, Docker and build edits.

Protected main review gates must remain in force. Keep tests, the existing
80% coverage thresholds, CodeQL and secret scanning. A failed dependency
install is a blocker, never evidence of a successful build. Do not fabricate
lockfile integrity data, signatures, CAPS, CKS or CK grades.

Only successful protected-main builds may be signed. Signing permissions
are job-scoped and absent from PR builds. Verification pins the repository,
workflow certificate identity, main ref and source/signer SHA; tampered
content and a different signer must fail. `PROVENANCE.md` defines these checks.
`.github/BUILD.md` lists manual admin prerequisites and lockfile recovery.

No production operation, workflow dispatch, secret creation, settings
change, main push or direct memory ingestion is authorized by this repair.
The lockfile refresh workflow is provided for a future deliberate operator
run. Evidence and the three-type memory payload are under
`.bits/out/DISP-BUILD-writers/`. REFLEX and CK stamping remain post-merge work.

Rollback: revert this repair through a reviewed PR. Do not delete historical
attestations or bypass required checks. This file documents build controls;
it does not replace the repository license or establish a new licensing policy.

# ─── CGRF Header ──────────────────────────────
# File:        .bits/queue/DISP-AUTOMATION-writers.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-WRITERS-AUTOMATION-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-AUTOMATION-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     .bits/srs_registry.yml
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON .bits/srs_registry.yml; GATES SRS-CN-WRITERS-AUTOMATION-001
# DAG Node:    none
# Intent:      Authorize public-safe CI and automation infrastructure changes for the Writers Guild.
# ───────────────────────────────────────────────

# DISP-AUTOMATION-writers

- srs: SRS-CN-WRITERS-AUTOMATION-001
- guild: writers
- champion: Quill
- branch: main
- status: ready
- brief: Authorize CI/automation infrastructure changes for the writers guild.

Fix service catalog, add PostHog env documentation, enable Datadog CI Visibility, and add CODEOWNERS. Self-gate `npm run lint` + `npm test`. Open a PR titled after the SRS.

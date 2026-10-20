<!--
# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/srs/SRS-CN-WRITERS-GOVERNANCE-001.md
# Stage:       04_HYPOTHESIZE
# SRS:         SRS-CN-WRITERS-GOVERNANCE-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-GOVERNANCE-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .bits/srs_registry.yml
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON .bits/srs_registry.yml; GATES .github/workflows/provenance.yml; GATES GOVERNANCE.md
# DAG Node:    none
# Intent:      Bound operator-authorized Writers Guild governance and signed provenance work.
# ───────────────────────────────────────────────────────────────
-->

# Writers Guild ownership governance and signed build provenance

SRS: SRS-CN-WRITERS-GOVERNANCE-001  
Dispatch: DISP-GOVERNANCE-writers  
Status: in_progress  
Seat: BITS-CODEGEN; mode: staging

## Authorization and scope

Authenticated operator Dmitry Richard (mr.nobody@citadel-nexus.com) directed
"create those" through Bits AI and explicitly authorized this local SRS and
in-progress dispatch bootstrap. This record captures the operator's scope;
it does not claim a VCC database update or author a USO blueprint.

Implement CODEOWNERS, a guild charter, documented default-branch protection,
and CI-generated signed SLSA provenance with verification instructions.
Guildmaster: Quill (GitLab `quill`). Datadog team: `guild-writers`.
This specific directive authorizes the new provenance workflow and ownership
update despite the prior sprint's workflow and existing-header restrictions.
It does not authorize changes to other workflows or other SRS entries.

## Acceptance criteria

1. Name Quill as accountable guildmaster; use a valid GitHub ownership route
   without assuming a GitLab username or Datadog handle is a GitHub identity.
2. Define written-content, wiki, publishing-health and Writers Floor scope,
   approval requirements and escalation to the guildmasters group.
3. Specify admin activation of code-owner review, signed commits and required
   checks for the default branch. Do not claim documentation enforces settings.
4. Build and test the existing TypeScript package on PRs with read-only token
   permissions. Attest only artifacts from trusted `main` runs, using short-lived
   GitHub OIDC and GitHub artifact attestations, without long-lived signing keys.
5. Document verification of the artifact digest, repository, signer workflow
   and source ref, plus remaining admin and live-CI validation steps.
6. Run npm lint, tests and build; inspect workflow privilege boundaries and
   packaging. Report failures without claiming a successful hosted signing run.

## Bounds

One SRS and PR; no deployment, production operations, GitHub settings changes,
secret creation, direct publication, or modifications to the notify workflow.
Use existing root/.github/.bits layout with logical CGRF stage assignments.
No application module changes; application coverage comes from the existing suite.
CKS gate: B+/75. Actual CKS, CAPS and CK remain pending.

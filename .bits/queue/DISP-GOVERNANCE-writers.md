<!--
# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/queue/DISP-GOVERNANCE-writers.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-WRITERS-GOVERNANCE-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-GOVERNANCE-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .bits/srs/SRS-CN-WRITERS-GOVERNANCE-001.md
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON .bits/srs/SRS-CN-WRITERS-GOVERNANCE-001.md; GATES GOVERNANCE.md; GATES .github/workflows/provenance.yml
# DAG Node:    none
# Intent:      Record operator authority and reviewable acceptance gates for this staging bootstrap.
# ───────────────────────────────────────────────────────────────
-->

# DISP-GOVERNANCE-writers

status: in_progress  
SRS: SRS-CN-WRITERS-GOVERNANCE-001  
Seat: BITS-CODEGEN  
Mode: staging  
Branch: bits/SRS-CN-WRITERS-GOVERNANCE-001-signed-provenance

## Authorization source

Current-session operator directive through Bits AI from authenticated Dmitry
Richard (mr.nobody@citadel-nexus.com): **"create those"**. The operator explicitly
authorized creating this dispatch and SRS, ownership/governance, default-branch
protection documentation or config, and a workflow for signed build provenance.
No production, deploy, push to main, GitHub settings changes or secrets.
This is a local dispatch; external VCC synchronization remains operator-owned.

Operator follow-up under this same SRS and dispatch confirms, through the
Datadog `guild-writers` team links, GitHub owner team
`@citadel-nexus/guild-writers` and Quill's automation app
`quill-writers-guildmaster`. Apply the team as CODEOWNERS owner and record the
app as the expected ruleset actor; no personal GitHub identity lookup remains.

## Task table

| Phase | Task | Gate |
| --- | --- | --- |
| A | Register scoped SRS and dispatch; preserve earlier registry entries | Registry contains this SRS and dispatch status is in_progress |
| B | Guild charter, ownership and admin protection instructions | Quill, confirmed team/app identities, scope, approvals and escalation are explicit |
| C | Read-only PR build and trusted-main signed provenance | Signing is isolated from builds and never runs on PRs or non-main refs |
| D | Verify, record memory and prepare review metadata | Smoke results and live-CI limitations are recorded truthfully |

After each phase, print `Phase <letter>: PASS` or `Phase <letter>: FAIL`.
On failure, stop for diagnosis and report the failure before proceeding.

## Smoke test

Run from the repository root with Node.js 20+ and installed lockfile dependencies.
The archive is a compiled application bundle, not an installed runtime or a
replacement for the existing release/container workflows.

```bash
set -euo pipefail
npm run lint
npm test
npm run build
mkdir -p /tmp/writers-provenance-smoke
tar -czf /tmp/writers-provenance-smoke/writers.tar.gz dist/src package.json package-lock.json LICENSE
tar -tzf /tmp/writers-provenance-smoke/writers.tar.gz | rg '^dist/src/index.js$'
sha256sum /tmp/writers-provenance-smoke/writers.tar.gz
node --input-type=module -e 'import { readFileSync as r } from "node:fs"; import assert from "node:assert/strict"; assert.match(r(".bits/srs_registry.yml", "utf8"), /^SRS-CN-WRITERS-GOVERNANCE-001:/m); assert.match(r(".bits/queue/DISP-GOVERNANCE-writers.md", "utf8"), /^status: in_progress/m); console.log("Phase A: PASS");'
```

Additionally inspect YAML structure, PR permissions, trusted-ref signing gates,
artifact names and digest verification instructions. Hosted OIDC signing and
GitHub rules enforcement require post-merge validation and admin activation.

## Memory Brief

No injected Memory Brief was supplied. Prior art used: the existing TypeScript
npm scripts and GitHub Actions conventions. The operator-confirmed ownership
mapping is `@citadel-nexus/guild-writers`; Quill's automation app is
`quill-writers-guildmaster`. GitHub team visibility/write access and ruleset
activation remain admin settings requirements, not identity follow-ups.

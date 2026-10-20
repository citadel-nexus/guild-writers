<!--
# ─── CGRF Header ───────────────────────────────────────────────
# File:        GOVERNANCE.md
# Stage:       06_PLAN
# SRS:         SRS-CN-WRITERS-GOVERNANCE-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-GOVERNANCE-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .github/CODEOWNERS, .github/workflows/provenance.yml, .bits/srs/SRS-CN-WRITERS-GOVERNANCE-001.md
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON .github/CODEOWNERS; DEPENDS_ON .github/workflows/provenance.yml; DEPENDS_ON .bits/srs/SRS-CN-WRITERS-GOVERNANCE-001.md
# DAG Node:    none
# Intent:      Make Writers Guild accountability and artifact trust requirements explicit for maintainers.
# ───────────────────────────────────────────────────────────────
-->

# Writers Guild governance and artifact trust

## Charter and ownership

The Writers Guild owns written content, narrative canon, wiki quality,
publishing health and the Writers Floor. The guildmaster is **Quill**
(GitLab user `quill`). The Datadog team handle is `guild-writers`.
The legal owner is Citadel Nexus Inc.

Quill is accountable for editorial direction, content acceptance, publishing
health, the Writers Floor contract and delegation of reviewer responsibilities.
Contributors propose changes through scoped pull requests with an authorized
SRS and dispatch. Reviewers check public-safe content, accessibility, source
accuracy, tests and provenance as appropriate to the change.

`.github/CODEOWNERS` routes all paths, including governance and workflows, to
`@citadel-nexus/writers-guild`, the existing GitHub owner team. Its membership
and write access have not been verified in this session. **GitLab `quill` is
not proof of ownership of GitHub `@quill`.** Before activating code-owner rules,
an admin must confirm Quill's GitHub account, grant it explicit write access,
and add that verified handle to the wildcard owner line. Confirm the owner
team is visible and has explicit write access too. Do not substitute the
Datadog handle for a GitHub team.

## Decisions, approvals and escalation

- Routine changes require one approval from an eligible code owner other than
  the author, passing required checks, resolved review conversations and a PR.
- Changes to the charter, ownership, workflows or publishing trust policy
  require Quill's explicit approval (or a documented acting guildmaster
  designated by the guildmasters group). Record that decision in the PR.
- Quill resolves editorial and implementation disagreements within guild scope.
  Cross-guild contracts, unresolved disputes, absence or conflicts involving
  Quill escalate to the **guildmasters group** through the operator's existing
  coordination channel. Record the decision and approver in the PR; do not
  invent a GitHub group handle or a new communication endpoint.
- Authors cannot approve their own changes. If Quill authors a sensitive
  change, obtain approval from a non-author acting guildmaster designated by
  the guildmasters group. Urgent changes follow the same approval and check
  requirements. Record rollback and impact before merging.

CODEOWNERS requires an eligible owner's approval; it cannot enforce that a
particular person or every listed owner approves. The guildmaster approval
rule above remains a documented review obligation.

## Default-branch protections: admin activation required

This repository has no settings/ruleset management integration. This document
is the configuration contract; adding a file alone does **not** change GitHub
settings. An organization/repository admin must create an **active branch
ruleset** targeting the default branch (currently `main`) with:

| Requirement | GitHub setting |
| --- | --- |
| Changes enter via PR | Require a pull request before merging; at least 1 approval |
| Ownership approval | Require review from Code Owners; first resolve the identity/access prerequisites above |
| Approval freshness | Dismiss stale approvals on new commits; require approval of the most recent reviewable push by someone other than its author |
| Review completion | Require conversation resolution before merging |
| Commit authenticity | Require signed commits; contributors must use a GitHub-verified signing identity |
| Merge validation | Require status checks and require branches to be up to date |
| History integrity | Block force pushes and deletion; keep bypass list empty, including routine admin bypass |

Select the existing CI `build` check and the new **`Provenance build`** check
from the **GitHub Actions** source after they have appeared on a PR. Confirm
the exact displayed contexts before saving; checks must not be optional or
matched to an untrusted producer. Do not require `Sign build provenance`: it
intentionally skips PRs and only signs after a trusted `main` build succeeds.
Do not enable a merge queue without adding and validating `merge_group`
triggers for every required workflow. If the default branch is renamed,
update both workflow branch filters and the attestation/verification ref gates.

The admin should test that an unsigned commit, missing owner approval, and a
failed required check each block a disposable PR, then confirm a fully approved,
signed and passing PR can merge. Signed commits and signed build attestations
serve separate purposes; enabling one does not enable the other.

## Signed build artifacts

`Writers build provenance` runs lint, tests and the existing TypeScript build
on PRs and `main` pushes (and supports manual runs). It archives `dist/src`,
`package.json`, `package-lock.json` and `LICENSE` as
`writers-<commit SHA>.tar.gz`. Tests, dependency directories, source environment
files and credentials are excluded. This is a compiled application bundle;
it does not include installed production dependencies or replace the existing
package/container release pipeline. Existing release artifacts are not covered
by this new attestation.

PR builds have a read-only token and no signing permission. Only a successful
push/manual run on `refs/heads/main` in `citadel-nexus/guild-writers` can enter
the separate signing job. That job downloads the immutable artifact from the
same run, executes none of its contents, and uses `actions/attest-build-provenance`
to create a **SLSA v1 build provenance statement signed by Sigstore keyless**,
with GitHub OIDC as the identity source. The signed statement binds the archive's
SHA-256 digest to the repository, source commit and workflow invocation. This
supplies artifact signing via the signed digest; there is no separate long-lived
key, detached archive signature or manual CK signing.

The statement is stored in GitHub's artifact attestation API and a Sigstore
bundle is uploaded alongside the build as a separate workflow artifact. The
checksum manifest is a transfer convenience, not an independent trust anchor.
This does not assert a certified SLSA assurance level or reproducible builds.

## GitHub Actions admin prerequisites

- Enable Actions and allow checkout, setup-node, upload-artifact,
  download-artifact and attest-build-provenance at the versions in the workflow.
  A policy requiring full action SHAs needs reviewed, resolved action pins before
  this workflow can run; existing repository conventions use major-version tags.
- Permit job-scoped `id-token: write` and `attestations: write` for trusted runs,
  while keeping default token permissions read-only. No signing secret is needed.
- Confirm artifact attestations are available for this public repository and
  organization policy. Private/internal repositories require appropriate GitHub
  Enterprise support. Confirm outbound access to GitHub's attestation and
  Sigstore services on hosted runners.
- Confirm 30-day artifact retention fits policy. Download both artifacts for
  longer retention; provenance verification still requires the exact archive.
- After merge, validate a trusted `main` run end to end using the instructions
  below. PR builds do not prove that hosted OIDC signing works.

## Verify an artifact before use

Use an authenticated, current GitHub CLI with `gh attestation verify` support.
Choose a **successful trusted-main run** of `provenance.yml` from the Actions UI,
and independently obtain the expected commit SHA from the reviewed merged PR.
Do not use a SHA or run ID supplied only by an untrusted artifact distributor.
Replace the two placeholder values, then run in a new directory:

```bash
set -euo pipefail
REPO=citadel-nexus/guild-writers
RUN_ID=REPLACE_WITH_TRUSTED_MAIN_RUN_ID
EXPECTED_SHA=REPLACE_WITH_REVIEWED_FULL_COMMIT_SHA

gh run view "$RUN_ID" --repo "$REPO" --json workflowName,event,headBranch,headSha,conclusion
# Confirm: Writers build provenance, push/workflow_dispatch, main,
# expected SHA, and success before continuing.
test "$(gh run view "$RUN_ID" --repo "$REPO" --json headSha --jq .headSha)" = "$EXPECTED_SHA"
gh run download "$RUN_ID" --repo "$REPO" --name "writers-build-$EXPECTED_SHA" --dir build
gh run download "$RUN_ID" --repo "$REPO" --name "writers-provenance-$EXPECTED_SHA" --dir provenance
(cd build && sha256sum --check SHA256SUMS)

gh attestation verify "build/writers-$EXPECTED_SHA.tar.gz"   --repo "$REPO"   --signer-workflow "$REPO/.github/workflows/provenance.yml"   --source-ref refs/heads/main   --source-digest "$EXPECTED_SHA"   --predicate-type https://slsa.dev/provenance/v1   --deny-self-hosted-runners
```

Require verification to exit successfully before extracting or executing any
content. `--source-digest` binds the expected source commit as well as the tool's
archive digest check. A checksum match alone is insufficient. Reject artifacts
from PR runs, other repositories/workflows/refs, unexpected commits or failed
runs even when their filenames look correct.

To verify against the retained bundle instead of fetching the attestation from
the API, repeat the same `gh attestation verify` command with
`--bundle provenance/<downloaded-bundle-filename>.jsonl`. Keep all repository,
workflow, source and predicate restrictions. A retained bundle does not promise
a fully offline verification environment; the CLI may need trust-root material.

As a negative check, copy the archive, append a byte to the copy and verify it
with the same constraints. Verification must fail on the changed digest. Also
confirm an intentionally incorrect `--source-digest` fails. The workflow's
signed statement is required; do not bypass failure by accepting only SHA256SUMS.

## Filing and evidence

SRS: SRS-CN-WRITERS-GOVERNANCE-001. Dispatch: DISP-GOVERNANCE-writers.
The operator-authorized bootstrap uses the existing repository layout: this
charter is logical stage `06_PLAN`, SRS is `04_HYPOTHESIZE`, and `.github`/`.bits`
records are `11_COMMIT`. Evidence and memory payloads live under
`.bits/out/DISP-GOVERNANCE-writers/`. CK, CAPS and CKS remain pending for their
own review/stamping processes. No GitHub setting has been enabled by these files.

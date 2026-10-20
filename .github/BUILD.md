<!--
# ─── CGRF Header ───────────────────────────────────────────────
# File:        .github/BUILD.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-WRITERS-BUILD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-BUILD-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .github/workflows/lockfile-refresh.yml, .github/workflows/provenance.yml, .nvmrc
# EnumType:    Doc
# EnumEdges:   DEPENDS_ON .github/workflows/lockfile-refresh.yml; DEPENDS_ON .github/workflows/provenance.yml; DEPENDS_ON .nvmrc
# DAG Node:    none
# Intent:      Explain the manual lockfile repair and verified artifact flow with admin prerequisites.
# ───────────────────────────────────────────────────────────────
-->

# Writers build and lockfile recovery

SRS: SRS-CN-WRITERS-BUILD-001. Dispatch: DISP-BUILD-writers.

## Manual lockfile refresh

Run **Refresh Writers lockfile** from Actions using `main`. The workflow is
`workflow_dispatch` only, rejects other refs/repositories, and uses SHA-pinned
actions with Node from `.nvmrc`. Node 24.13.0 includes the pinned npm 11.6.2.
It runs `npm install --package-lock-only --ignore-scripts`, then all of:

```bash
npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

A failure stops the flow before any review branch or PR is created. Fix actual
lint/typecheck/test failures without weakening tests, then retry. The refresh job
has only contents/package read access; registry credentials are available only
to its install/validation step. Build scripts execute under that read-only token.
A separate job with contents/pull-request write access downloads only the validated
lockfile and never executes the artifact or project scripts.

Only a changed `package-lock.json` is proposed on `bits/lockfile-refresh`, based
on the exact validated main revision. Other tracked changes fail the run. There
is no push to main, force push, auto-merge, deployment or ruleset bypass. A second
run is serialized. If the fixed review branch already exists, the workflow fails
without changing it: review and merge/close the existing PR, then delete that
branch before retrying. An unchanged lockfile succeeds without creating a PR.

The Contents API produces the commit with SRS/dispatch footers, using the normal
GitHub token identity. The workflow requires GitHub to report its signature as
verified before opening the PR. It creates no signing keys. If that requirement
or PR creation fails, the review branch can remain for inspection; no automatic
cleanup or overwrite is attempted.

The previously restored @opentelemetry/api entry, including its integrity, exactly
matches the earlier repository lock at 86c1868. No invented integrity data was
found in this continuation, so that genuine entry is retained. The workflow is
the registry-backed way to regenerate the rest of the graph; do not copy
versionless placeholders from an offline lock-only install.

## Admin prerequisites

- Actions must allow the four SHA-pinned actions in lockfile-refresh.yml and
  GitHub-hosted runners with npm registry, GitHub API, artifact-service and
  GitHub Packages access. No workflow is executed from this coding session.
- Permit `contents: write` and `pull-requests: write` for the publication job,
  `packages: read` for the refresh job, and **Allow GitHub Actions to create and
  approve pull requests** in repository/organization Actions settings. The
  workflow only creates a PR; it never approves one.
- setup-node routes `@citadel-guilds` to `https://npm.pkg.github.com`; all other
  packages use the public npm registry. Grant this repository's GITHUB_TOKEN read
  access to any required GitHub packages. All current dependencies are unscoped
  or other public scopes. If a future private package uses another scope, review
  that mapping explicitly. No new secret is created or required by this workflow.
- Keep code-owner approval, signed commits and required checks enabled. Confirm
  API commits from this installation receive verified GitHub signatures; the
  workflow fails before PR creation if verification is false.
- PRs created with GITHUB_TOKEN generally do not trigger normal pull_request CI.
  A human must close/reopen the generated PR to trigger the required checks, or
  use a separately approved automation identity in a future change. Do not
  bypass required checks or treat the manual run's main-branch checks as the PR's.
- The existing attestation job still needs id-token/attestations write permissions
  and artifact attestation availability. No settings are changed by these files.

## Provenance verification

The trusted-main signing job now verifies the exact compiled archive immediately
after attesting it, using its returned Sigstore bundle. `gh attestation verify`
requires the repository, `provenance.yml` signer workflow, `refs/heads/main`,
expected source SHA, SLSA v1 predicate and GitHub-hosted runner identity. The
positive check must pass before the negative checks run.

It then appends bytes to a temporary archive copy and requires verification to
fail. It separately requires the original archive to fail when the signer is
incorrectly specified as `lockfile-refresh.yml`. If either is accepted, the job
fails. A final positive verification must pass before the bundle is uploaded.
The original artifact and bundle are preserved; no tampered copy is uploaded.

For downloaded artifacts, use the trusted run and reviewed SHA from GOVERNANCE.md,
then verify with the same policy:

```bash
gh attestation verify "writers-$EXPECTED_SHA.tar.gz" \
  --bundle "$BUNDLE_PATH" \
  --repo citadel-nexus/guild-writers \
  --signer-workflow citadel-nexus/guild-writers/.github/workflows/provenance.yml \
  --source-ref refs/heads/main --source-digest "$EXPECTED_SHA" \
  --predicate-type https://slsa.dev/provenance/v1 --deny-self-hosted-runners
```

The workflow's positive and negative checks need real hosted attestations.
Local shell-control-flow tests cannot demonstrate cryptographic verification.
A negative command's nonzero exit alone can also reflect an infrastructure error;
the positive checks around it prevent treating an entirely unavailable verifier
as success, but do not classify every possible transient failure.

## Session publishing and current evidence

PR 21 already merged the earlier build repairs. The bound local publishing branch
was rebased onto current main at cceb26ebdbe8066e80c4e745d4b56da515735d56 without
rewriting any published commit. The next diff contains only this continuation;
no previous build commit needs replaying. Create/Update PR remains an external UI
operation, and its final branch suffix/new PR number cannot be controlled here.
The UI previously created PR 21 after PR 20 merged, so the retained metadata
branch name alone is not evidence that a new PR is impossible.

Local command results and their dependency blockers are recorded in
`.bits/out/DISP-BUILD-writers/report.md`. Hosted lockfile regeneration, full build
validation and signed-artifact verification remain pending until those workflows
run successfully. Existing tests, coverage gates and security scans are preserved.

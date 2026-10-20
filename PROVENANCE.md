# ─── CGRF Header ──────────────────────────────
# File:         PROVENANCE.md
# Stage:        06_PLAN
# SRS:          SRS-CN-WRITERS-BUILD-001
# CAPS:         pending
# CK:           pending
# Dispatch:     DISP-BUILD-writers
# Seat:         BITS-CODEGEN
# Owner:        Citadel Nexus Inc.
# Created:      2026-10-20
# Depends:      .github/workflows/ci.yml, .github/scripts/verify-provenance.sh
# EnumType:     Doc
# EnumEdges:    DEPENDS_ON .github/workflows/ci.yml; DEPENDS_ON .github/scripts/verify-provenance.sh
# DAG Node:     none
# Intent:       Define the signed artifact and exact verification policy without claiming unperformed signing.
# ──────────────────────────────────────────────

# Writers build provenance

The attested subject is `writers-build.tar.gz`, containing only `dist/src/`
JavaScript and declarations from a clean successful TypeScript build. It is
not a container signature, npm-package signature, deployment approval or CK
stamp. Packaging requires nonempty entrypoints and rejects links, tests,
source files, dependencies, empty directories and unexpected top-level output.
These guards rely on the protected CI build to produce authentic compiler
output; inspecting file names alone does not prove where bytes came from.

The CI build runs lint, typecheck, tests with existing coverage gates, build,
and packaging before uploading `writers-build`. A separate job signs only
a successful `push` build on `refs/heads/main`, using GitHub Actions OIDC and
SLSA v1 build provenance. PRs, including forks, cannot run the signing job.
The job publishes the signed bundle as `writers-provenance` after verification.

## Verification policy

The workflow invokes `gh attestation verify` with the generated bundle and:

- repository: `citadel-nexus/guild-writers`;
- exact certificate identity:
  `https://github.com/citadel-nexus/guild-writers/.github/workflows/ci.yml@refs/heads/main`;
- OIDC issuer: `https://token.actions.githubusercontent.com`;
- source ref: `refs/heads/main`;
- source and signer digests: the run's full Git commit SHA;
- self-hosted runners denied; default SLSA v1 predicate enforced.

Download the artifact and bundle from the same successful main run. Set the
expected SHA independently from the reviewed source, not from an untrusted
artifact or an unverified statement, then run:

```bash
export GITHUB_REPOSITORY=citadel-nexus/guild-writers
export GITHUB_SHA=<full-reviewed-main-commit-sha>
bash .github/scripts/verify-provenance.sh writers-build.tar.gz attestation.jsonl
```

Use the actual downloaded bundle filename in place of `attestation.jsonl`.
The GitHub CLI must support the flags used by the script. Using `--bundle`
avoids artifact lookup races; trust-root retrieval may still need network
access. A successful verification must precede and follow both negative checks.

The script appends bytes to a temporary copy and requires its verification
to fail. It also requires the original artifact to fail with certificate
identity `untrusted.yml` instead of `ci.yml`. A verifier accepting either
negative case fails the job. The signed artifact is never modified. All
checks use the same bundle and repository/ref/SHA policy.

## Evidence and rollout

`node --test test/build-provenance.check.mjs` checks packaging rejection and
verification control flow with a local fake CLI. It does **not** claim that
an actual signature was verified. Cryptographic success, tamper rejection,
and wrong-identity rejection must still be observed in a real protected-main
Actions run after dependencies resolve. No attestation, deploy, workflow
execution or settings change was performed in this staging session.

Repository rules and admin prerequisites are in `.github/BUILD.md` and
`GOVERNANCE.md`. CKS/CAPS/CK remain pending; GitHub provenance does not compute them.

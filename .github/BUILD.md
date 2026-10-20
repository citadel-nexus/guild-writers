# ─── CGRF Header ──────────────────────────────
# File:         .github/BUILD.md
# Stage:        11_COMMIT
# SRS:          SRS-CN-WRITERS-BUILD-001
# CAPS:         pending
# CK:           pending
# Dispatch:     DISP-BUILD-writers
# Seat:         BITS-CODEGEN
# Owner:        Citadel Nexus Inc.
# Created:      2026-10-20
# Depends:      .github/workflows/lockfile-refresh.yml, PROVENANCE.md
# EnumType:     Doc
# EnumEdges:    DEPENDS_ON .github/workflows/lockfile-refresh.yml; DEPENDS_ON PROVENANCE.md
# DAG Node:     none
# Intent:       Give operators a guarded route to real lockfile metadata and state the required admin setup.
# ──────────────────────────────────────────────

# Writers build and lockfile recovery

Use Node 24.13.0 (`.nvmrc`) and npm 11. Install with `npm ci`, then run
`npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
The test command runs offline provenance guard tests before Vitest and its
unchanged 80% branch/function/line/statement coverage gates.

`tsconfig.json` checks the service and tests without emitting files.
`tsconfig.build.json` emits the active service to `dist/src/`; the build
clears old output first and refuses output on compiler errors. The two
unused legacy automation stubs remain outside the existing build graph
and lint scope. They are not runtime entrypoints.

## Lockfile refresh

The current lockfile predates the added ESLint dependencies. Do not edit
integrity hashes, invent resolutions, or use `npm install` as a CI fallback.

1. Once `lockfile-refresh.yml` exists on the default branch, an authorized
   operator selects **Actions → Refresh npm lockfile → Run workflow → main**.
   Other refs are refused. There are no push, PR, schedule or deployment triggers.
2. The runner reads `.nvmrc`; setup-node configures `@citadel-guilds` against
   `https://npm.pkg.github.com`. Other packages use the public npm registry.
   `NODE_AUTH_TOKEN` references the job's `GITHUB_TOKEN`; no token is embedded.
3. `npm install --package-lock-only --ignore-scripts` resolves real registry
   metadata. `npm ci && npm run lint && npm run typecheck && npm test && npm run build`
   must all succeed before the PR step executes.
4. The action proposes only `package-lock.json` on `bits/lockfile-refresh`,
   targeting main. It never auto-merges or pushes to main. Repeated runs update
   that dedicated automation branch; do not put manual work on it.
5. Review the dependency diff and all required checks before merging. PRs
   created with `GITHUB_TOKEN` may not trigger follow-up Actions automatically.
   A maintainer must arrange an approved check run; never waive required gates.

**Bootstrap blocker:** a brand-new dispatch-only workflow cannot be selected
until it exists on the default branch. If required CI blocks this repair
because the old lockfile lacks lint dependencies, obtain a registry-backed
lockfile in an authorized checkout and include it before merging. Otherwise
an administrator must plan an approved workflow bootstrap. This change does
not bypass protections, merge failing checks, or change repository settings.

## Administrator prerequisites (manual, not performed by this dispatch)

- Rulesets protect main: PR review and required lint/typecheck/test/build and
  security checks; prevent direct and force pushes. Review workflow changes
  with the existing CODEOWNERS team.
- Allow Actions to create pull requests. The refresh job requests only
  `contents: write`, `pull-requests: write`, and `packages: read`. All its
  external actions are pinned to full commit SHAs.
- Grant this repository Actions read access to any required GitHub Packages
  packages. `packages: read` cannot override package-level access policy.
  No private SDK or new secret is required by the current package manifest.
- Permit Actions artifact attestations and `id-token: write` for the protected
  main provenance job; the build and PR jobs do not receive signing permissions.
  Runner access to GitHub, npm registries and Sigstore trust services is required.
- Keep CodeQL, TruffleHog and the private-import checks enabled. This dispatch
  does not modify the security-scan workflow or any admin policy.

## Provenance and limits

See `PROVENANCE.md` for artifact identity and verification. CI packages only
validated output after all build checks pass; signing is limited to push
runs on main. Download `writers-build` and `writers-provenance` from the same
run for consumer verification. The existing release workflow has no GHCR
login step in this base; the malformed GHCR expressions were in CI and are
corrected there. Release uses the shared Node version and all build gates.
Existing publishing jobs are not executed by this staging session.

Offline sandbox results and remaining blockers are recorded in
`.bits/out/DISP-BUILD-writers/report.md`. No registry metadata was fabricated.

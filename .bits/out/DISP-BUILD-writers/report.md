# ─── CGRF Header ──────────────────────────────
# File:         .bits/out/DISP-BUILD-writers/report.md
# Stage:        11_COMMIT
# SRS:          SRS-CN-WRITERS-BUILD-001
# CAPS:         pending
# CK:           pending
# Dispatch:     DISP-BUILD-writers
# Seat:         BITS-CODEGEN
# Owner:        Citadel Nexus Inc.
# Created:      2026-10-20
# Depends:      .bits/queue/DISP-BUILD-writers.md, .bits/out/DISP-BUILD-writers/memory.json
# EnumType:     Doc
# EnumEdges:   DEPENDS_ON .bits/out/DISP-BUILD-writers/memory.json; DEPENDS_ON .bits/out/DISP-BUILD-writers/memory.json.cgrf.yaml; DEPENDS_ON .bits/queue/DISP-BUILD-writers.md; DEPENDS_ON .bits/srs/SRS-CN-WRITERS-BUILD-001.md; DEPENDS_ON .bits/srs_registry.yml; DEPENDS_ON .dockerignore; DEPENDS_ON .github/BUILD.md; DEPENDS_ON .github/scripts/package-provenance.mjs; DEPENDS_ON .github/scripts/verify-provenance.sh; DEPENDS_ON .github/workflows/ci.yml; DEPENDS_ON .github/workflows/lockfile-refresh.yml; DEPENDS_ON .github/workflows/release.yml; DEPENDS_ON .gitignore; DEPENDS_ON .nvmrc; DEPENDS_ON .nvmrc.cgrf.yaml; DEPENDS_ON GOVERNANCE.md; DEPENDS_ON PROVENANCE.md; DEPENDS_ON docker/Dockerfile; DEPENDS_ON eslint.config.mjs; DEPENDS_ON package.json; DEPENDS_ON src/livingworld/state.ts; DEPENDS_ON test/build-provenance.check.mjs; DEPENDS_ON tsconfig.build.json; DEPENDS_ON tsconfig.build.json.cgrf.yaml; DEPENDS_ON tsconfig.json
# DAG Node:     none
# Intent:       Record actual offline evidence and blockers without claiming a successful dependency-backed build.
# ──────────────────────────────────────────────

# DISP-BUILD-writers report

## §1 SUMMARY

Status: PARTIAL — implementation prepared; registry and hosted verification blocked.
Dispatch: DISP-BUILD-writers (in_progress)
Seat: BITS-CODEGEN
SRS: SRS-CN-WRITERS-BUILD-001
Branch: bits/SRS-CN-WRITERS-BUILD-001-build-repair
Base: supplied main at 258fc755aecea9284a24530f99534fbe2943b451
Tasks: 4/5 implemented; full validation remains blocked
Smoke: 16/16 offline tests; 0/5 complete npm gates
CKS Gate: B+/75; CKS: pending; CAPS: pending; CK: pending
Commits: one focused session change; resolve its SHA with
`git log -1 --format='%H %s' --grep='SRS: SRS-CN-WRITERS-BUILD-001'`.
No hosted PR, workflow run or external VCC database update was created here.

## §2 TASK RESULTS

| Task | Status | Output | Verify | CKET |
|---|---|---|---|---|
| 1 — Build repair | PARTIAL | Node 24.13.0, separate lint/typecheck/build, numeric activity, runtime-only Docker output | `npm run lint && npm run typecheck && npm test && npm run build` | 11_COMMIT / existing 07_BUILD |
| 2 — Lockfile refresh | PASS (static) | Manual authenticated refresh, five gates, pinned actions, lockfile-only PR | Inspect `.github/workflows/lockfile-refresh.yml`; YAML command below | 11_COMMIT |
| 3 — Provenance | PARTIAL | Guarded archive, main-only signing, exact identity and tamper rejection | `node --test test/build-provenance.check.mjs`; real Actions run pending | 11_COMMIT / 08_TEST |
| 4 — Operator documentation | PASS | Build recovery, admin prerequisites, signer policy, governance | `test -s .github/BUILD.md && test -s GOVERNANCE.md && test -s PROVENANCE.md` | 11_COMMIT / 06_PLAN |
| 5 — Validation and evidence | PARTIAL | All available offline checks attempted and blockers retained | Commands in §3 | 11_COMMIT |

Phase A gate: PASS for offline configuration/runtime checks; npm acceptance BLOCKED.
Phase B gate: PASS for offline packaging and verification control flow; cryptographic acceptance BLOCKED.
Phase C gate: PASS for local artifacts; hosted publication and post-merge REFLEX pending.

## §3 SMOKE TEST RESULTS

No registry requests were attempted over the network; npm used offline mode.
No lockfile metadata or integrity values were changed.

| Command | Expected | Actual | Result / root cause / next verification |
|---|---|---|---|
| `npm ci --offline --ignore-scripts --no-audit --no-fund` | Dependencies installed | Exit 1, ENOTCACHED for @eslint/js | BLOCKED: registry metadata absent; run the documented registry-backed refresh, then ordinary `npm ci` |
| `npm run lint` | ESLint succeeds | Exit 2, @eslint/js not installed | BLOCKED by install; rerun after lockfile refresh |
| `npm run typecheck` | Strict TypeScript succeeds | Exit 127, tsc not found | BLOCKED by install; rerun after lockfile refresh |
| `npm test` | Existing Vitest suite and coverage pass | Native guard tests passed; exit 127, vitest not found | BLOCKED for full suite/coverage; rerun after lockfile refresh |
| `npm run build` | Clean dist/src emitted | Exit 127, tsc not found | BLOCKED by install; rerun after lockfile refresh |
| `node --test test/build-provenance.check.mjs` | Runtime, packaging and verification controls pass | 16/16 pass | PASS; uses fake gh for control flow, not cryptographic evidence |
| `node --experimental-test-coverage --test-coverage-include='.github/scripts/package-provenance.mjs' --test test/build-provenance.check.mjs` | New packaging module above 80% | Lines 96.83%, branches 88.46%, functions 100% | PASS; existing Vitest coverage remains unmeasured |
| `bash -n .github/scripts/verify-provenance.sh` | Valid shell | Exit 0 | PASS |
| `node --check eslint.config.mjs` | Valid module syntax | Exit 0 | PASS; ESLint rules still require installed packages |
| YAML command below | Parse all workflows | Exit 0 | PASS; not a hosted Actions execution |
| Preservation command below | No changes to lockfile/security/coverage/existing tests | Empty output | PASS |

Initial offline harness run: 11/15 passed; four fake-CLI tests failed because
a newline in the generated mock script was escaped incorrectly. Fixed the
fixture escaping; all 15 passed, then added a native-TypeScript runtime
regression for fractional activity and quiet fallback; final 16/16 passed.
The activity check exercises runtime semantics, not a TypeScript compile.

Runnable YAML/JSON parsing (Python with PyYAML, available in this sandbox):

```bash
python - <<'CHECK'
from pathlib import Path
import json, yaml, re
for p in Path('.github/workflows').glob('*.yml'):
    yaml.safe_load(p.read_text())
for name in ['package.json', 'tsconfig.json', 'tsconfig.build.json']:
    json.loads(Path(name).read_text())
w = yaml.load(Path('.github/workflows/lockfile-refresh.yml').read_text(), Loader=yaml.BaseLoader)
assert list(w['on']) == ['workflow_dispatch']
j = w['jobs']['refresh']
assert j['permissions'] == {'contents': 'write', 'pull-requests': 'write', 'packages': 'read'}
assert j['if'] == "github.ref == 'refs/heads/main'"
for step in j['steps']:
    if 'uses' in step:
        assert re.fullmatch(r'[^@]+@[a-f0-9]{40}', step['uses'])
assert j['steps'][-1]['with']['branch'] == 'bits/lockfile-refresh'
assert j['steps'][-1]['with']['add-paths'] == 'package-lock.json'
assert j['steps'][-1]['with']['base'] == 'main'
assert j['steps'][2]['run'] == 'npm install --package-lock-only --ignore-scripts'
assert j['steps'][3]['run'] == 'npm ci && npm run lint && npm run typecheck && npm test && npm run build'
c = yaml.load(Path('.github/workflows/ci.yml').read_text(), Loader=yaml.BaseLoader)
assert c['permissions'] == {'contents': 'read'}
p = c['jobs']['provenance']
assert p['needs'] == 'build'
assert p['if'] == "github.event_name == 'push' && github.ref == 'refs/heads/main'"
assert p['permissions'] == {'contents': 'read', 'id-token': 'write', 'attestations': 'write'}
print('PASS: configuration and workflow policy')
CHECK
```

```bash
git diff 258fc755aecea9284a24530f99534fbe2943b451 -- package-lock.json .github/workflows/security-scan.yml vitest.config.ts 'test/*.test.ts'
```

Not run: Docker image build (requires unavailable dependencies/image access),
real OIDC issuance, signature verification, workflow execution, hosted checks,
action SHA resolution against remote action repositories, or REFLEX.
No measured full-service coverage or successful build is claimed.

## §4 MEMORY INGEST

Type A count: 26
Type B count: 59
Type C count: 2
IOO compliance: true
DKG orphans: 0
Payload: .bits/out/DISP-BUILD-writers/memory.json
No direct memory ingestion performed; all CK/CAPS values remain pending.

## §5 CKET FILING

Existing repository paths retained under AGENTS.md and the current directive.
Stage labels are logical envelopes, matching the repository's existing layout.
06_PLAN: GOVERNANCE.md, PROVENANCE.md.
04_HYPOTHESIZE: .bits/srs/SRS-CN-WRITERS-BUILD-001.md.
11_COMMIT: build config, workflow, operator docs, dispatch/report/memory artifacts.
08_TEST: test/build-provenance.check.mjs.
07_BUILD: existing src/livingworld/state.ts (numeric annotation only).
13_SAVE: none; memory uses the requested .bits/out dispatch path.
CGRF headers: every new artifact has an envelope; JSON and .nvmrc use sidecars.
REFLEX check: deferred to post-merge; validator is not accessed here.

## §6 GOVERNANCE

Entity: Citadel Nexus Inc.
License posture: existing LICENSE says MIT; unchanged. No BUSL claim is made.
Verify: `head -n 1 LICENSE`.
Scope: current operator directive authorizes this build/CI repair; no forbidden
ledger, attestation-chain internals or notify-citadel workflow changes.
Changed-file credential-pattern scan: passed; not a full secret audit.
Stripe mode: not applicable; no checkout or payment code touched.
Existing ownership, tests, 80% coverage thresholds and security scans retained.
CK/CAPS/CKS: pending.

## §7 NEXT ACTIONS

Blockers:
1. Real registry metadata and installed lint/TypeScript/Vitest dependencies.
   The lockfile intentionally remains unchanged until authenticated resolution.
2. Manual workflow bootstrap: dispatch-only workflows must exist on default
   before they can be selected. Required CI may prevent this merge until a
   registry-enabled authorized checkout supplies the real lockfile. See BUILD.md.
3. Actual OIDC signing plus valid/tampered/wrong-signer checks in protected-main CI.
4. Admin prerequisites (rulesets, Actions PR creation/attestations/OIDC and package
   read access) documented, not inspected or changed.
5. PR creation is outside this session; use the coding agent UI. Metadata is prepared.

Handoffs: operator/admin workflow bootstrap and registry access; no private-stack handoff.
Suggested next dispatch: continue DISP-BUILD-writers with real lockfile and hosted evidence.
Out-of-scope observations: the two pre-existing unused automation stubs remain
excluded. Release has no GHCR login in this base and package.json remains private;
no npm publication was attempted. No issue comment was posted (provider access is read-only).

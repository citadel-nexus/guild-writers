<!--
# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/out/DISP-BUILD-writers/report.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-WRITERS-BUILD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-BUILD-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .bits/queue/DISP-BUILD-writers.md, .bits/out/DISP-BUILD-writers/memory.json.cgrf.yaml
# EnumType:    Doc
# EnumEdges:   DEPENDS_ON .bits/queue/DISP-BUILD-writers.md; VALIDATES .bits/queue/DISP-BUILD-writers.md; VALIDATES .bits/srs/SRS-CN-WRITERS-BUILD-001.md; VALIDATES .bits/srs_registry.yml; VALIDATES .github/workflows/ci.yml; VALIDATES .github/workflows/provenance.yml; VALIDATES .github/workflows/release.yml; VALIDATES .github/workflows/security-scan.yml; VALIDATES .nvmrc; VALIDATES docker/Dockerfile; VALIDATES eslint.config.mjs; VALIDATES package-lock.json; VALIDATES package.json; VALIDATES package.json.cgrf.yaml; VALIDATES src/livingworld/state.ts; VALIDATES tsconfig.build.json; VALIDATES tsconfig.build.json.cgrf.yaml; VALIDATES tsconfig.json; PRODUCES .bits/out/DISP-BUILD-writers/memory.json; DEPENDS_ON .bits/out/DISP-BUILD-writers/memory.json.cgrf.yaml
# DAG Node:    none
# Intent:      Preserve build-repair evidence and explicit blockers before review.
# ───────────────────────────────────────────────────────────────
-->

# Writers Guild build repair report

## §1 SUMMARY

Status: PARTIAL — NOT READY TO MERGE
Dispatch: DISP-BUILD-writers
Seat: BITS-CODEGEN; mode: staging
SRS: SRS-CN-WRITERS-BUILD-001
Branch: bits/SRS-CN-WRITERS-BUILD-001-build-repair
Base: f7e5fd61c1f03959599f29c94d493c552b3d5365 (origin/main, governance PR 20 merged)
Tasks: authorization and candidate config/CI repairs implemented; dependency repair and full validation blocked.
Smoke: 0/5 requested commands passing. Supplementary static groups: 5/5 passing.
CKS Gate: B+/75; CKS: pending; CAPS: pending; CK: pending.
Commits: inspect with `git log --oneline f7e5fd61c1f03959599f29c94d493c552b3d5365..HEAD`.

## §2 TASK RESULTS

| Phase | Status | Result | Verify | Files / CKET |
| --- | --- | --- | --- | --- |
| A | PASS | Operator authorization registered; branch starts after merged governance changes | `git merge-base --is-ancestor f7e5fd61c1f03959599f29c94d493c552b3d5365 HEAD` | Registry, SRS, dispatch / 04_HYPOTHESIZE, 11_COMMIT |
| B | PARTIAL | Pin Node 24.13.0/npm 11.6.2; separate lint/typecheck/build; preserve strictness; restore one lost lock entry from history | Requested commands below | Manifest, lock, Node pin, ESLint and TS config / 11_COMMIT |
| C | PASS for static checks | Correct GHCR expressions and container entrypoint; pin CI/container runtime; require checked compiled entrypoint for provenance; preserve scans | Static script below | CI/release/security/provenance workflows, Dockerfile / 11_COMMIT |
| D | PARTIAL | Record failed command results and review evidence; no complete lock or real artifact exists yet | Requested commands below and JSON payload | This output directory / 11_COMMIT |

The container remains a consumer of the build. No container was built, published
or deployed. The source change is a one-line ESLint exception for the existing
intentional control-character sanitizer; its behavior is unchanged. All test
files and coverage thresholds are byte-identical to the base.

## §3 SMOKE TEST RESULTS

| Command | Expected | Actual | Result |
| --- | --- | --- | --- |
| `npm ci` with `npm_config_offline=true` | Lock-consistent clean install, exit 0 | Exit 1, ENOTCACHED for eslint registry metadata | BLOCKED |
| `npm run lint` | Local ESLint passes, exit 0 | Exit 2, @eslint/js missing; falls back to sandbox ESLint 9.16.0 | BLOCKED |
| `npm run typecheck` | All checked TypeScript passes, exit 0 | Exit 127, tsc not installed | BLOCKED |
| `npm test` | Existing tests/coverage pass, exit 0 | Exit 127, vitest not installed | BLOCKED |
| `npm run build` | Fresh production dist/src output, exit 0 | Exit 127 after clean, tsc not installed | BLOCKED |

### Root cause and applied changes

The original offline install reported missing ajv, ajv-formats,
ajv-formats-draft2019, libxmljs2 and @opentelemetry/api lock entries. It also
reported unresolved optional WASM peers. CI selected Node 20 despite locked
Vitest requiring Node 22/24+ and Supabase requiring Node 22+. GHCR credentials
were literal `${ ... }` strings instead of GitHub `${{ ... }}` expressions.

The Node pin and CI expressions are corrected. The @opentelemetry/api 1.9.1 lock
entry (including its original integrity) is restored verbatim from repository
commit 86c1868. Other existing resolved entries remain unchanged. **This is not
a complete lockfile repair**: the optional dependency graph and newly declared
ESLint dependencies still require registry-backed npm resolution. The manifest
and lockfile are not fully synchronized; this PR must remain unmerged.

An offline lock-only regeneration trial on a temporary copy returned success
but introduced six unresolved versionless placeholders and removed transitive
metadata. That output was rejected and never copied into the repository.
Regenerating the intended manifest instead fails ENOTCACHED for eslint metadata.
This sandbox has no cached project dependency tarballs/metadata and shell
internet access is unavailable; no outbound install was attempted. Do not fake
integrity values, drop optional dependency metadata, or weaken tests to bypass it.

TypeScript now checks without emitting, retains all strict flags and test inputs,
and includes integrations explicitly. A separate build config emits the existing
production graph with noEmitOnError, after cleaning dist. Tests import Vitest
explicitly, so production compilation no longer loads its globals. Historically
excluded, unreferenced NATS/CML prototype files remain outside this checked graph;
this repair does not turn those prototypes into runtime services.

ESLint uses its recommended JavaScript and TypeScript rules over the checked
surface. A diagnostic run with sandbox ESLint 9.16.0/typescript-eslint 8.18.0
found the intentional sanitizer regex; the narrowly documented exception makes
that diagnostic pass. These older sandbox tools are not the declared project
toolchain and this result does not make `npm run lint` pass. ESLint config syntax
checks pass with `node --check eslint.config.mjs`; nvm successfully parses the
commented .nvmrc. The available TypeScript 5.7.3 can parse `--showConfig` but is
not the declared 5.9.x compiler and cannot typecheck absent dependencies.

### Supplementary static checks

Five groups pass: Node/CI/container agreement; strictness/tests/scans preservation;
CI expressions/order and signing isolation; packaging fixture positive/negative
checks; recovered lock provenance and preservation of existing resolved entries.
The initial packaging fixture had invalid package.json content and correctly
failed Node's syntax check; fixing the fixture to valid JSON made the positive
case pass. No application checks or assertions were relaxed.

Copy the following Python block from the repository root (Python + PyYAML,
Node 24.13.0, Git, bash, tar and sha256sum required). Fixtures are synthetic and
do not demonstrate a real application build, dependency completeness or hosted
OIDC signing. The packaging checks reject absent, empty and invalid entrypoints
and verify checksum tampering is rejected.

```python
from pathlib import Path
import json, os, subprocess, tarfile, tempfile
import yaml

base='f7e5fd61c1f03959599f29c94d493c552b3d5365'
def original(path):
    return subprocess.check_output(['git','show',f'{base}:{path}'],text=True)
def workflow(path):
    return yaml.load(Path(path).read_text(),Loader=yaml.BaseLoader)
package=json.loads(Path('package.json').read_text())
pin=[line for line in Path('.nvmrc').read_text().splitlines() if line and not line.startswith('#')]
assert pin==[package['engines']['node']]==['24.13.0']
assert package['packageManager']=='npm@'+package['engines']['npm']
assert subprocess.check_output(['node','--version'],text=True).strip()=='v'+pin[0]
for name in ['ci','release','provenance','security-scan']:
    data=workflow(f'.github/workflows/{name}.yml')
    setup=[step for job in data['jobs'].values() for step in job['steps'] if step.get('uses','').startswith('actions/setup-node@')]
    assert setup and all(step['with']['node-version-file']=='.nvmrc' for step in setup)
docker=Path('docker/Dockerfile').read_text()
assert 'ARG NODE_VERSION='+pin[0] in docker
assert docker.count('node:${NODE_VERSION}-alpine')==2
assert '"dist/src/index.js"' in docker
print('Node pin and CI/container agreement: PASS')

tsc=json.loads(Path('tsconfig.json').read_text())
build=json.loads(Path('tsconfig.build.json').read_text())
old=json.loads(original('tsconfig.json'))
for key in ['strict','noUncheckedIndexedAccess','exactOptionalPropertyTypes','useUnknownInCatchVariables']:
    assert tsc['compilerOptions'][key] is old['compilerOptions'][key] is True
assert tsc['compilerOptions']['noEmit'] and tsc['compilerOptions']['noEmitOnError']
assert set(old['include']) <= set(tsc['include'])
assert build['extends']=='./tsconfig.json' and build['compilerOptions']['noEmit'] is False
assert all(item.startswith('src/') for item in build['include'])
assert Path('vitest.config.ts').read_text()==original('vitest.config.ts')
assert not subprocess.check_output(['git','diff',base,'--','test'],text=True)
scan=workflow('.github/workflows/security-scan.yml')
baseline=yaml.load(original('.github/workflows/security-scan.yml'),Loader=yaml.BaseLoader)
assert scan['jobs']['secret-scan']==baseline['jobs']['secret-scan']
assert [step for step in scan['jobs']['codeql']['steps'] if not step.get('uses','').startswith('actions/setup-node@')]==baseline['jobs']['codeql']['steps']
print('TypeScript strictness, tests, coverage and security scan preservation: PASS')

ci=workflow('.github/workflows/ci.yml')
login=next(step for step in ci['jobs']['docker']['steps'] if step.get('uses','').startswith('docker/login-action@'))
assert login['with']['username']=='${{ github.actor }}'
assert login['with']['password']=='${{ secrets.GITHUB_TOKEN }}'
assert ci['jobs']['docker']['permissions']['contents']=='read'
provenance=workflow('.github/workflows/provenance.yml')
assert provenance['jobs']['attest']==yaml.load(original('.github/workflows/provenance.yml'),Loader=yaml.BaseLoader)['jobs']['attest']
for name,job in [('ci','build'),('release','release'),('provenance','provenance-build')]:
    steps=workflow(f'.github/workflows/{name}.yml')['jobs'][job]['steps']
    commands=[s['run'] for s in steps if s.get('run','').startswith('npm ')]
    assert commands[:5]==['npm ci','npm run lint','npm run typecheck','npm test','npm run build']
print('CI expressions, validation order and isolated signing boundary: PASS')

script=next(s['run'] for s in provenance['jobs']['provenance-build']['steps'] if s.get('name')=='Package compiled application')
with tempfile.TemporaryDirectory(prefix='writers-build-check-') as directory:
    root=Path(directory);sha='a'*40
    env={**os.environ,'GITHUB_SHA':sha}
    def package_fixture():
        return subprocess.run(['bash','-c',script],cwd=root,env=env,capture_output=True).returncode
    assert package_fixture()!=0
    (root/'dist/src').mkdir(parents=True)
    (root/'dist/src/index.js').write_text('')
    (root/'dist/src/index.d.ts').write_text('export declare const fixture: boolean;\n')
    assert package_fixture()!=0
    (root/'dist/src/index.js').write_text('export {')
    assert package_fixture()!=0
    (root/'dist/src/index.js').write_text('export const fixture = true;\n')
    for name in ['package.json','package-lock.json','LICENSE','.env']:
        (root/name).write_text('packaging fixture only\n')
    (root/'package.json').write_text('{"type":"module"}\n')
    assert package_fixture()==0
    with tarfile.open(root/f'artifacts/writers-{sha}.tar.gz') as archive:
        assert 'dist/src/index.js' in archive.getnames()
        assert '.env' not in archive.getnames()
    assert subprocess.run(['sha256sum','--check','SHA256SUMS'],cwd=root/'artifacts',capture_output=True).returncode==0
    with (root/f'artifacts/writers-{sha}.tar.gz').open('ab') as artifact:
        artifact.write(b'tampered')
    assert subprocess.run(['sha256sum','--check','SHA256SUMS'],cwd=root/'artifacts',capture_output=True).returncode!=0
print('Provenance packaging negative/positive fixtures: PASS (no real build or signing)')

lock=json.loads(Path('package-lock.json').read_text())
old_lock=json.loads(original('package-lock.json'))
assert all('version' in data for key,data in lock['packages'].items() if key)
for key,data in old_lock['packages'].items():
    if key:
        assert lock['packages'][key]==data
historic=json.loads(subprocess.check_output(['git','show','86c1868:package-lock.json'],text=True))
assert lock['packages']['node_modules/@opentelemetry/api']==historic['packages']['node_modules/@opentelemetry/api']
print('Recovered lock metadata matches history; existing resolved entries preserved: PASS')
print('Full dependency graph/lock regeneration: BLOCKED by unavailable registry metadata')
```

### Required unblock and revalidation

In an authorized environment with registry.npmjs.org access, select Node 24.13.0
and npm 11.6.2, then run:

```bash
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Review the complete generated lockfile, resolve any remaining compiler/lint/test
failures without lowering coverage or dropping tests, then execute the provenance
packaging step against the real build. Hosted signing and verification still need
a later trusted-main Actions run. No success is claimed for any blocked step.

## §4 MEMORY INGEST

Payload: .bits/out/DISP-BUILD-writers/memory.json
Type A: 20; Type B: 43; Type C: 4.
IOO compliance: true; DKG orphans: 0.
Verify syntax: `python -m json.tool .bits/out/DISP-BUILD-writers/memory.json`.
Payload describes partial outcomes; no external memory write is performed.

## §5 CKET FILING

04_HYPOTHESIZE: SRS document.
11_COMMIT: dispatch, registry, build/CI configuration and output evidence.
07_BUILD: existing state module's lint comment only; no behavior change.
Logical stages follow the repository's existing layout. New files carry CGRF
headers; new JSON files use sibling envelopes. REFLEX is deferred to the private
post-merge validator and was not read or executed.

## §6 GOVERNANCE

Entity: Citadel Nexus Inc. (Delaware C-Corp).
License posture: unchanged; no relicensing or license review.
Hard-NO scope: operator-authorized build files only; no notify workflow changes.
Secret scan: no prohibited credential prefixes in changed files.
Stripe mode: not applicable; no checkout changes.
Production/deploy/publish/settings/secrets operations: none.
Tests: preserved; new application coverage not measured.
CodeQL and secret scanning: retained; required source and scan steps checked.
CK, CAPS and CKS: pending.
Labels when opening the new PR: bits:codegen, srs:srs-cn-writers-build-001,
dispatch:disp-build-writers, verified:static-only, verified:manual-review.
Do not apply verified:tests-pass.

## §7 NEXT ACTIONS

Blocker: obtain registry-backed dependency resolution, finish the lockfile and
run all five requested commands with the declared toolchain. Do not merge yet.
Then verify real-build packaging and trusted-main signed provenance. This is a
new build-repair PR; governance PR 20 is already merged and is not reopened.
No admin setting changes or credentials are needed for the local configuration
edits. No handoffs or out-of-scope bug comments were posted. Any follow-up stays
within DISP-BUILD-writers until its acceptance criteria are actually met.

Publication blocker: the PR metadata tool retains the prior immutable session
branch dd/bits/SRS-CN-WRITERS-GOVERNANCE-001-signed-provenance even when supplied
the new build branch. No new PR was created and no refs were pushed. Do not use
the merged governance PR's update flow for this work; a separate publishing
session is required for the requested new build-repair PR. Local changes are on
bits/SRS-CN-WRITERS-BUILD-001-build-repair based on the merged main branch.

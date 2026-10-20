<!--
# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/out/DISP-GOVERNANCE-writers/report.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-WRITERS-GOVERNANCE-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-GOVERNANCE-writers
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .bits/queue/DISP-GOVERNANCE-writers.md
# EnumType:    Doc
# EnumEdges:   DEPENDS_ON .bits/queue/DISP-GOVERNANCE-writers.md; VALIDATES .github/workflows/provenance.yml; VALIDATES GOVERNANCE.md; PRODUCES .bits/out/DISP-GOVERNANCE-writers/memory.json
# DAG Node:    none
# Intent:      Preserve reproducible checks and unresolved prerequisites for governance review.
# ───────────────────────────────────────────────────────────────
-->

# Governance bootstrap report

## §1 SUMMARY

Status: PARTIAL  
Dispatch: DISP-GOVERNANCE-writers  
Seat: BITS-CODEGEN  
SRS: SRS-CN-WRITERS-GOVERNANCE-001  
Branch: bits/SRS-CN-WRITERS-GOVERNANCE-001-signed-provenance  
Tasks: 3/4 implemented; verification partial  
Smoke: 1/6 passing; 3 failed; 2 blocked  
Supplementary static validation: 4/4 groups passing  
CKS Gate: B+/75; CKS: pending; CAPS: pending; CK: pending  
Commits: resolve after capture with `git log --format='%h %s' 258fc755aecea9284a24530f99534fbe2943b451..HEAD`.

## §2 TASK RESULTS

| Task | Status | Output | Verify | Files | CKET |
| --- | --- | --- | --- | --- | --- |
| A — authorize | PASS | Local SRS and in-progress dispatch; original registry entries preserved | Reproduce static checks below | .bits/srs_registry.yml, .bits/srs/SRS-CN-WRITERS-GOVERNANCE-001.md, .bits/queue/DISP-GOVERNANCE-writers.md | 04_HYPOTHESIZE, 11_COMMIT |
| B — govern | PASS with admin prerequisite | Quill accountable; operator-confirmed guild-writers team owns all paths; quill-writers-guildmaster app is the expected automation actor; protection and escalation rules documented | Reproduce static checks; inspect GOVERNANCE.md | GOVERNANCE.md, .github/CODEOWNERS | 06_PLAN, 11_COMMIT |
| C — attest | PASS for implementation | Read-only PR build; isolated trusted-main keyless signing and retained bundle; no deploy | Reproduce static checks below | .github/workflows/provenance.yml | 11_COMMIT |
| D — verify and report | PARTIAL | Static checks pass; dependency/tooling blocks real build and smoke target | Run dispatch smoke in a dependency-equipped environment | .bits/out/DISP-GOVERNANCE-writers/ | 11_COMMIT |

## §3 SMOKE TEST RESULTS

| Check / command from dispatch | Expected | Actual | Result |
| --- | --- | --- | --- |
| `npm run lint` | Typecheck exits 0 | Exit 127, tsc not found | FAIL |
| `npm test` | Tests and coverage exit 0 | Exit 127, vitest not found | FAIL |
| `npm run build` | Compiled application exits 0 | Exit 127, tsc not found | FAIL |
| Archive creation and `tar -tzf /tmp/writers-provenance-smoke/writers.tar.gz` entry check | Real compiled entrypoint included | No compiled build available | BLOCKED |
| `sha256sum /tmp/writers-provenance-smoke/writers.tar.gz` | Real archive digest | No compiled build available | BLOCKED |
| Registry/dispatch Node assertion from dispatch | Registered SRS and in_progress | Exit 0 | PASS |

Root cause: `npm ci --offline --ignore-scripts` exits 1 (EUSAGE) reporting missing
lockfile peers including ajv, ajv-formats, ajv-formats-draft2019, libxmljs2 and
@opentelemetry/api. An offline retry with `--legacy-peer-deps` fails identically.
No dependencies were available. This does not prove what a network-enabled CI
install will do; the package manifest and lockfile were not modified. No network
install was attempted because this sandbox does not support shell internet access.
Applied fix: none within this governance SRS. Reverify with `npm ci`, then the
complete dispatch smoke block in an authorized dependency-equipped environment.
If CI reproduces the failure, repair dependencies under a separate scoped dispatch.

The identity follow-up updates the team owner and documents Quill's app as the
expected ruleset actor. Supplementary static checks were rerun for this edit;
the recorded npm failures were not rerun because application code,
workflows and dependencies are unchanged.

No new application modules or pytest tests were added. Application coverage was
not measured. Real OIDC issuance, signature verification, negative signature/source
checks and GitHub enforcement remain pending. Local packaging used synthetic files
only and proves archive selection/checksum behavior, not a signed real build.

### Reproduce supplementary static checks

Requires Python 3 with PyYAML, Git, bash, sha256sum and GitHub CLI. Copy this block
from the repository root, or extract its Python body and execute it. It validates
registry preservation; workflow structure and 64 allow/deny cases; fixture archive
inclusion/exclusion and checksum tampering; and verification CLI flag availability.

```python
from pathlib import Path
import itertools
import json
import os
import re
import subprocess
import tarfile
import tempfile
from types import SimpleNamespace
import yaml

base = '258fc755aecea9284a24530f99534fbe2943b451'
srs = 'SRS-CN-WRITERS-GOVERNANCE-001'
dispatch = 'DISP-GOVERNANCE-writers'
original = subprocess.check_output(['git', 'show', f'{base}:.bits/srs_registry.yml'], text=True)
assert Path('.bits/srs_registry.yml').read_text().startswith(original)
registry = yaml.safe_load(Path('.bits/srs_registry.yml').read_text())
assert registry[srs]['status'] == 'in_progress'
assert registry[srs]['dispatch'] == dispatch
assert re.search(r'^status: in_progress\s*$', Path(f'.bits/queue/{dispatch}.md').read_text(), re.M)
print('Registry preservation and authorization: PASS')

workflow = yaml.load(Path('.github/workflows/provenance.yml').read_text(), Loader=yaml.BaseLoader)
assert set(workflow['on']) == {'pull_request', 'push', 'workflow_dispatch'}
assert workflow['on']['pull_request']['branches'] == ['main']
assert workflow['on']['push']['branches'] == ['main']
assert workflow['permissions'] == {'contents': 'read'}
build = workflow['jobs']['provenance-build']
sign = workflow['jobs']['attest']
assert 'permissions' not in build
assert sign['needs'] == 'provenance-build'
assert sign['permissions'] == {'contents': 'read', 'id-token': 'write', 'attestations': 'write'}
assert sign['runs-on'] == 'ubuntu-latest'
assert all('run' not in step for step in sign['steps'])
assert not any('checkout' in step['uses'] for step in sign['steps'])
assert 'secrets.' not in Path('.github/workflows/provenance.yml').read_text()
assert all(step.get('with', {}).get('persist-credentials') == 'false' for step in build['steps'] if 'checkout' in step.get('uses', ''))
condition = sign['if'].replace('&&', ' and ').replace('||', ' or ').strip()
for repository, ref, event in itertools.product(
    ['citadel-nexus/guild-writers', 'other/fork'],
    ['refs/heads/main', 'refs/heads/feature', 'refs/pull/1/merge', 'refs/tags/v1.0.0'],
    ['push', 'workflow_dispatch', 'pull_request', 'pull_request_target']
):
    github = SimpleNamespace(repository=repository, ref=ref, event_name=event)
    actual = eval(condition, {'__builtins__': {}}, {'github': github})
    expected = repository == 'citadel-nexus/guild-writers' and ref == 'refs/heads/main' and event in ['push', 'workflow_dispatch']
    assert actual == expected, (repository, ref, event)
assert [step['run'] for step in build['steps'] if step.get('run', '').startswith('npm ')] == ['npm ci', 'npm run lint', 'npm test', 'npm run build']
assert build['steps'][-1]['with']['name'] == sign['steps'][0]['with']['name']
assert sign['steps'][1]['uses'] == 'actions/attest-build-provenance@v3'
assert sign['steps'][1]['with']['subject-path'] == 'artifacts/writers-${{ github.sha }}.tar.gz'
assert sign['steps'][2]['with']['path'] == '${{ steps.attest.outputs.bundle-path }}'
print('Workflow structure and 64 signing-gate cases: PASS')

package_script = next(step['run'] for step in build['steps'] if step.get('name') == 'Package compiled application')
with tempfile.TemporaryDirectory(prefix='writers-package-check-') as directory:
    root = Path(directory)
    for name in ['dist/src/index.js', 'dist/src/index.d.ts', 'package.json', 'package-lock.json', 'LICENSE', '.env', 'test/excluded.ts', 'node_modules/excluded.js', 'dist/test/excluded.js']:
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text('synthetic packaging fixture\n')
    sha = 'a' * 40
    subprocess.run(['bash', '-c', package_script], cwd=root, env={**os.environ, 'GITHUB_SHA': sha}, check=True)
    with tarfile.open(root / f'artifacts/writers-{sha}.tar.gz') as archive:
        assert set(archive.getnames()) == {'dist/src', 'dist/src/index.js', 'dist/src/index.d.ts', 'package.json', 'package-lock.json', 'LICENSE'}
    subprocess.run(['sha256sum', '--check', 'SHA256SUMS'], cwd=root / 'artifacts', check=True, capture_output=True)
    with (root / f'artifacts/writers-{sha}.tar.gz').open('ab') as artifact:
        artifact.write(b'tampered')
    assert subprocess.run(['sha256sum', '--check', 'SHA256SUMS'], cwd=root / 'artifacts', capture_output=True).returncode != 0
print('Packaging fixture inclusion/exclusion and checksum tampering: PASS (not a real build)')

help_text = subprocess.check_output(['gh', 'attestation', 'verify', '--help'], text=True)
doc = Path('GOVERNANCE.md').read_text()
for flag in ['--repo', '--signer-workflow', '--source-ref', '--source-digest', '--predicate-type', '--deny-self-hosted-runners', '--bundle']:
    assert flag in help_text and flag in doc
for item in ['Quill', 'guild-writers', 'guildmasters group', 'Require signed commits', 'Code Owners', 'Provenance build', 'admin', '30-day']:
    assert item in doc
owner_lines = [line.strip() for line in Path('.github/CODEOWNERS').read_text().splitlines() if line.strip() and not line.startswith('#')]
assert owner_lines == ['* @citadel-nexus/guild-writers']
assert 'https://github.com/apps/quill-writers-guildmaster' in doc
rules = doc.split('## Default-branch protections:', 1)[1].split('## Signed build artifacts', 1)[0]
assert 'expected actor' in rules and '`quill-writers-guildmaster`' in rules
assert 'Do not grant the app a' in rules and 'ruleset bypass' in rules
print('Governance requirements and installed CLI verification flags: PASS')
print('Phase C: PASS (static checks only; hosted signing pending)')
```

## §4 MEMORY INGEST

Payload: .bits/out/DISP-GOVERNANCE-writers/memory.json  
Type A count: 9; Type B count: 21; Type C count: 4
IOO compliance: true; DKG orphans: 0  
Verify counts: `python -m json.tool .bits/out/DISP-GOVERNANCE-writers/memory.json`.
No external memory write is performed. The operator/post-merge workflow owns ingestion.

## §5 CKET FILING

- 06_PLAN: GOVERNANCE.md.
- 04_HYPOTHESIZE: .bits/srs/SRS-CN-WRITERS-GOVERNANCE-001.md.
- 11_COMMIT: ownership, provenance workflow, registry, dispatch and output evidence.
- 13_SAVE: none.

These are logical stages in the existing repository layout. All 7 new files have
CGRF envelopes (the JSON payload uses its sibling YAML sidecar); modified CODEOWNERS
has an updated envelope. The registry's original contents are preserved verbatim.
REFLEX validation is deferred to the private post-merge validator; it was not read
or executed. CGRF edge/memory consistency was checked locally.

## §6 GOVERNANCE

Entity: Citadel Nexus Inc. (Delaware C-Corp).  
License posture: unchanged; no license review or relicensing performed.  
Hard-NO scope: only operator-authorized governance paths changed; notify workflow,
application logic, signing-key infrastructure and deployment files untouched.  
Secret scan: no prohibited credential prefixes in changed files.  
Stripe mode: not applicable; no checkout code changed.  
CK/CAPS/CKS: pending.  
GitHub settings: unchanged.  
PR labels to apply in UI: bits:codegen, srs:srs-cn-writers-governance-001,
dispatch:disp-governance-writers, verified:static-only, verified:manual-review.
Do not apply verified:tests-pass.

## §7 NEXT ACTIONS

- Run installation, lint, tests, build and real archive smoke in CI; diagnose the
  dependency issue if it reproduces. Smoke target is not met in this sandbox.
- Admin activates and tests the default-branch rules and Actions permissions
  described in GOVERNANCE.md. No settings were changed by this session.
- After merge, verify trusted-main signed provenance and tamper/source rejection.
- Open the PR through the coding agent UI; apply the labels above and obtain guild
  review. External publication and VCC synchronization remain operator-owned.
- Handoffs requested: none. Suggested next dispatch: operator-assigned dependency
  validation if needed; no unauthorized dispatch was invented.
- Bugs filed: none; provider comments are unavailable through this session's
  read-only repository interface. Dependency failure is recorded here for review.

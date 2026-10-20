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
# EnumEdges:   DEPENDS_ON .bits/queue/DISP-BUILD-writers.md; VALIDATES .bits/queue/DISP-BUILD-writers.md; VALIDATES .bits/srs/SRS-CN-WRITERS-BUILD-001.md; VALIDATES .bits/srs_registry.yml; VALIDATES .github/BUILD.md; VALIDATES .github/workflows/ci.yml; VALIDATES .github/workflows/lockfile-refresh.yml; VALIDATES .github/workflows/provenance.yml; VALIDATES .github/workflows/release.yml; VALIDATES .github/workflows/security-scan.yml; VALIDATES .nvmrc; VALIDATES docker/Dockerfile; VALIDATES eslint.config.mjs; VALIDATES package-lock.json; VALIDATES package.json; VALIDATES package.json.cgrf.yaml; VALIDATES src/livingworld/state.ts; VALIDATES tsconfig.build.json; VALIDATES tsconfig.build.json.cgrf.yaml; VALIDATES tsconfig.json; PRODUCES .bits/out/DISP-BUILD-writers/memory.json; DEPENDS_ON .bits/out/DISP-BUILD-writers/memory.json.cgrf.yaml
# DAG Node:    none
# Intent:      Preserve current build continuation evidence and hosted validation limits.
# ───────────────────────────────────────────────────────────────
-->

# Writers build continuation report

## §1 SUMMARY

Status: PARTIAL — implementation complete for this continuation; hosted checks pending.
Dispatch: DISP-BUILD-writers; SRS: SRS-CN-WRITERS-BUILD-001.
Seat: BITS-CODEGEN; mode: staging.
Branch: dd/bits/SRS-CN-WRITERS-GOVERNANCE-001-signed-provenance (operator-directed bound branch).
Base: current main cceb26ebdbe8066e80c4e745d4b56da515735d56, including merged PR 21.
Tasks: 4/4 continuation items implemented or attempted with explicit limits.
Smoke: 0/5 npm commands passing; supplementary control-flow/static groups: 5/5.
CKS gate: B+/75; CKS: pending; CAPS: pending; CK: pending.
Commits: inspect `git log --oneline cceb26ebdbe8066e80c4e745d4b56da515735d56..HEAD`.

## §2 TASK RESULTS

| Task | Status | Result | Verify | Files / CKET |
| --- | --- | --- | --- | --- |
| 1 — refresh lock | PASS for implementation | Dispatch-only, SHA-pinned workflow validates registry-generated lock before separate least-privilege PR job; never modifies main or existing review branch | Reproduce Python checks below; inspect manual Actions run when available | lockfile-refresh.yml / 11_COMMIT |
| 2 — verify provenance | PASS for implementation | Positive bundle verification, required tamper/wrong-signer failures, final positive check, documented admin prerequisites | Reproduce verification control-flow tests below; hosted signatures still pending | provenance.yml and BUILD.md / 11_COMMIT |
| 3 — publishing base | PASS locally; UI action pending | Rebase onto current main advances bound branch without rewriting any published commit; prior build repairs already merged in PR 21 | `git merge-base --is-ancestor cceb26ebdbe8066e80c4e745d4b56da515735d56 HEAD` and `git diff --stat origin/main...HEAD` | Branch ancestry; SRS/dispatch records / 04_HYPOTHESIZE, 11_COMMIT |
| 4 — offline checks | PARTIAL | All five commands rerun; project dependencies remain unavailable | Commands and failures below | Report and memory / 11_COMMIT |

No lockfile hash was rewritten in this continuation. Every previously resolved
entry matches its earlier repository source; the restored @opentelemetry/api
entry matches 86c1868 exactly. This audits provenance of the hand-restored data,
not remote registry contents; registry-backed regeneration is still required.

## §3 SMOKE TEST RESULTS

| Command | Expected | Actual | Status |
| --- | --- | --- | --- |
| `npm_config_offline=true npm ci` | Exit 0, installed locked graph | Exit 1, ENOTCACHED for @eslint/js registry metadata | BLOCKED |
| `npm run lint` | Exit 0 | Exit 2, missing @eslint/js; sandbox ESLint cannot load project config | BLOCKED |
| `npm run typecheck` | Exit 0 | Exit 127, tsc not installed | BLOCKED |
| `npm test` | Exit 0 and existing coverage gates pass | Exit 127, vitest not installed | BLOCKED |
| `npm run build` | Exit 0, real dist/src output | Exit 127, tsc not installed | BLOCKED |

Root cause remains absent project dependency metadata/tarballs in the offline
sandbox. No network installation or workflow dispatch was attempted. The new
manual workflow supplies an authorized registry-enabled execution path; it will
stop without creating a PR if any real check fails. The currently merged manifest
and lock remain unsynchronized until that workflow succeeds. No tests, coverage
thresholds, CodeQL or secret-scanning steps were weakened or removed.

Applied verification changes: the actual archive is checked with the returned
Sigstore bundle, constrained repository/workflow/source-ref/source-SHA/predicate
and hosted-runner identity. The tampered copy and wrong signer must fail. A final
positive verification also must succeed. Negative failure alone does not prove a
particular cryptographic cause; positive checks prevent an always-failing verifier
from making the test green. Real signatures, API commits and PR creation were not
exercised in this sandbox.

### Reproduce supplementary checks

Requires Python with PyYAML, bash, Git, Node, jq and gh. The script tests actual
embedded workflow shell/Python. Mocked gh processes cannot make network calls and
prove control flow, not GitHub authentication, signature validity, or hosted
service availability. No fixture commits or author overrides are made.

```python
from pathlib import Path
import json,os,re,subprocess,tempfile
import yaml
base='cceb26ebdbe8066e80c4e745d4b56da515735d56'
def original(path):
    return subprocess.check_output(['git','show',f'{base}:{path}'],text=True)
def read_workflow(path):
    return yaml.load(Path(path).read_text(),Loader=yaml.BaseLoader)
refresh=read_workflow('.github/workflows/lockfile-refresh.yml')
assert set(refresh['on'])=={'workflow_dispatch'}
assert refresh['permissions']=={}
assert refresh['concurrency']['cancel-in-progress']=='false'
assert refresh['jobs']['refresh']['permissions']=={'contents':'read','packages':'read'}
assert refresh['jobs']['propose']['permissions']=={'contents':'write','pull-requests':'write'}
assert refresh['jobs']['propose']['needs']=='refresh'
assert refresh['jobs']['propose']['if']=="needs.refresh.outputs.changed == 'true'"
assert "github.ref == 'refs/heads/main'" in refresh['jobs']['refresh']['if']
assert "github.repository == 'citadel-nexus/guild-writers'" in refresh['jobs']['refresh']['if']
for job in refresh['jobs'].values():
    for step in job['steps']:
        if 'uses' in step:
            assert re.fullmatch(r'[^@]+@[0-9a-f]{40}',step['uses'])
        if 'run' in step:
            subprocess.run(['bash','-n'],input=step['run'],text=True,check=True)
steps=refresh['jobs']['refresh']['steps']
setup=next(s for s in steps if s.get('uses','').startswith('actions/setup-node@'))
assert setup['with']['node-version-file']=='.nvmrc'
assert setup['with']['scope']=='@citadel-guilds'
assert setup['with']['registry-url']=='https://npm.pkg.github.com'
install=next(s for s in steps if s.get('name')=='Regenerate and validate the lockfile')
assert install['env']['NODE_AUTH_TOKEN']=='${{ secrets.GITHUB_TOKEN }}'
assert 'npm install --package-lock-only --ignore-scripts' in install['run']
assert 'npm ci && npm run lint && npm run typecheck && npm test && npm run build' in install['run']
publish=refresh['jobs']['propose']['steps'][-1]['run']
assert 'git push' not in publish and 'force' not in publish.replace('# Never overwrite an existing review branch, force-push, or update main.','')
assert 'ref=refs/heads/bits/lockfile-refresh' in publish
assert '--base main --head bits/lockfile-refresh' in publish
assert '.commit.verification.verified == true' in publish
assert publish.index('.commit.verification.verified == true') < publish.index('gh pr create')
# Check the actual embedded Python payload generator without publishing anything.
python_payload=publish.split("python - <<'PYTHON'\n",1)[1].split('\nPYTHON',1)[0]
with tempfile.TemporaryDirectory() as directory:
    root=Path(directory);(root/'refreshed').mkdir();(root/'refreshed/package-lock.json').write_text('{"lockfileVersion":3}\n')
    subprocess.run(['python','-c',python_payload],cwd=root,env={**os.environ,'RUNNER_TEMP':directory,'LOCKFILE_BLOB_SHA':'a'*40},check=True)
    payload=json.loads((root/'lockfile-update.json').read_text())
    assert payload['branch']=='bits/lockfile-refresh'
    assert payload['sha']=='a'*40
    assert 'SRS: SRS-CN-WRITERS-BUILD-001' in payload['message']
print('Manual-only refresh, pinned actions, auth, job permissions and PR payload: PASS')

# Run the no-change/changed/unexpected-change gate in an isolated fixture repo.
gate=next(s['run'] for s in steps if s.get('id')=='lock')
with tempfile.TemporaryDirectory() as directory:
    root=Path(directory);repo=root/'repo';repo.mkdir()
    subprocess.run(['git','init','-q',str(repo)],check=True)
    for name in ['package-lock.json','package.json']:(repo/name).write_text('{}\n')
    subprocess.run(['git','add','.'],cwd=repo,check=True)
    # No fixture commits or author overrides: compare files against the staged index.
    output=root/'output';output.touch()
    env={**os.environ,'RUNNER_TEMP':directory,'GITHUB_OUTPUT':str(output)}
    def run_gate():
        return subprocess.run(['bash','-c',gate],cwd=repo,env=env,capture_output=True).returncode
    assert run_gate()==0 and 'changed=false' in output.read_text()
    (repo/'package-lock.json').write_text('{"lockfileVersion":3}\n')
    assert run_gate()==0 and 'changed=true' in output.read_text()
    assert (root/'lockfile-output/package-lock.json').read_bytes()==(repo/'package-lock.json').read_bytes()
    (repo/'package.json').write_text('{"name":"unexpected-change"}\n')
    assert run_gate()!=0
print('Refresh no-op, changed-lock and unexpected-manifest-change gates: PASS')

# Exercise branch/signature/PR guards without calling GitHub or pushing refs.
fake_publish_gh = r'''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
a=sys.argv[1:]
with (Path(os.environ['RUNNER_TEMP'])/'publish-calls').open('a') as log: log.write(json.dumps(a)+'\n')
mode=os.environ['PUBLISH_MODE']
if a[0]=='api' and 'matching-refs' in a[1]:
    print('1' if mode=='existing' else '0')
elif a[0]=='api' and a[1].endswith('?ref='+'a'*40):
    print('b'*40)
elif a[:3]==['api','--method','POST']:
    assert 'ref=refs/heads/bits/lockfile-refresh' in a
    assert 'sha='+'a'*40 in a
    print('{}')
elif a[:3]==['api','--method','PUT']:
    payload=json.loads(Path(a[a.index('--input')+1]).read_text())
    assert payload['branch']=='bits/lockfile-refresh'
    print(json.dumps({'commit':{'verification':{'verified':mode!='unsigned'}}}))
elif a[:2]==['pr','create']:
    assert a[a.index('--head')+1]=='bits/lockfile-refresh'
    assert a[a.index('--base')+1]=='main'
    print('fixture PR created')
else:
    raise AssertionError(a)
'''
for mode,expected in [('existing',1),('unsigned',1),('valid',0)]:
    with tempfile.TemporaryDirectory() as directory:
        root=Path(directory);(root/'bin').mkdir();(root/'refreshed').mkdir()
        (root/'refreshed/package-lock.json').write_text('{"lockfileVersion":3}\n')
        (root/'bin/gh').write_text(fake_publish_gh);(root/'bin/gh').chmod(0o755)
        env={**os.environ,'PATH':str(root/'bin')+os.pathsep+os.environ['PATH'],'RUNNER_TEMP':directory,'GH_REPO':'citadel-nexus/guild-writers','BASE_SHA':'a'*40,'PUBLISH_MODE':mode}
        result=subprocess.run(['bash','-c',publish],cwd=root,env=env,capture_output=True)
        assert result.returncode==expected,(mode,result.stderr.decode())
        calls=[json.loads(line) for line in (root/'publish-calls').read_text().splitlines()]
        assert any(call[:2]==['pr','create'] for call in calls)==(mode=='valid')
        if mode=='existing':assert len(calls)==1
print('Existing-branch refusal, unsigned-commit rejection and successful PR control flow: PASS (mocked GitHub)')


provenance=read_workflow('.github/workflows/provenance.yml')
old=yaml.load(original('.github/workflows/provenance.yml'),Loader=yaml.BaseLoader)
assert provenance['jobs']['provenance-build']==old['jobs']['provenance-build']
attest=provenance['jobs']['attest']
assert attest['if']==old['jobs']['attest']['if']
assert attest['permissions']==old['jobs']['attest']['permissions']
verify=next(s for s in attest['steps'] if s.get('name')=='Verify provenance and reject invalid artifacts or signers')
assert verify['env']['ATTESTATION_BUNDLE']=='${{ steps.attest.outputs.bundle-path }}'
script=verify['run'];subprocess.run(['bash','-n'],input=script,text=True,check=True)
# Fake gh tests only shell control flow/policy plumbing, never cryptography.
fake_gh='''#!/usr/bin/env python3
import os,sys
from pathlib import Path
a=sys.argv[1:]
assert a[:2]==['attestation','verify']
assert '--bundle' in a and '--deny-self-hosted-runners' in a
assert a[a.index('--source-ref')+1]=='refs/heads/main'
assert a[a.index('--source-digest')+1]=='a'*40
assert a[a.index('--repo')+1]=='citadel-nexus/guild-writers'
assert a[a.index('--predicate-type')+1]=='https://slsa.dev/provenance/v1'
correct=a[a.index('--signer-workflow')+1]=='citadel-nexus/guild-writers/.github/workflows/provenance.yml'
untampered=Path(a[2]).read_bytes()==b'fixture archive'
mode=os.environ['VERIFY_MODE']
counter=Path(os.environ['RUNNER_TEMP'])/'calls'
count=int(counter.read_text())+1 if counter.exists() else 1
counter.write_text(str(count))
accepted=correct and untampered
if mode=='accept_tampered' and correct: accepted=True
if mode=='accept_wrong_signer' and untampered: accepted=True
if mode=='reject_all': accepted=False
if mode=='fail_last_positive' and count==4: accepted=False
sys.exit(0 if accepted else 1)
'''
for mode,expected in [('normal',0),('accept_tampered',1),('accept_wrong_signer',1),('reject_all',1),('fail_last_positive',1)]:
    with tempfile.TemporaryDirectory() as directory:
        root=Path(directory);(root/'bin').mkdir();(root/'artifacts').mkdir()
        (root/'bin/gh').write_text(fake_gh);(root/'bin/gh').chmod(0o755)
        (root/('artifacts/writers-'+'a'*40+'.tar.gz')).write_bytes(b'fixture archive')
        env={**os.environ,'PATH':str(root/'bin')+os.pathsep+os.environ['PATH'],'GITHUB_SHA':'a'*40,'GITHUB_REPOSITORY':'citadel-nexus/guild-writers','RUNNER_TEMP':directory,'ATTESTATION_BUNDLE':str(root/'fixture.jsonl'),'VERIFY_MODE':mode}
        result=subprocess.run(['bash','-c',script],cwd=root,env=env,capture_output=True)
        assert result.returncode==expected,(mode,result.stderr.decode())
        assert (root/('artifacts/writers-'+'a'*40+'.tar.gz')).read_bytes()==b'fixture archive'
print('Verification control flow: correct case passes; tamper/wrong-signer acceptance and positive-check failures stop the job: PASS (mocked CLI)')

lock=json.loads(Path('package-lock.json').read_text())['packages']
historic=json.loads(subprocess.check_output(['git','show','86c1868:package-lock.json']))['packages']
assert lock['node_modules/@opentelemetry/api']==historic['node_modules/@opentelemetry/api']
for name in ['package-lock.json','vitest.config.ts','.github/workflows/security-scan.yml']:
    assert Path(name).read_text()==original(name)
assert not subprocess.check_output(['git','diff',base,'--','test'],text=True)
subprocess.run(['git','merge-base','--is-ancestor',base,'HEAD'],check=True)
help_text=subprocess.check_output(['gh','attestation','verify','--help'],text=True)
for flag in ['--bundle','--repo','--signer-workflow','--source-ref','--source-digest','--predicate-type','--deny-self-hosted-runners']:assert flag in help_text
print('Genuine historical lock integrity, tests/scans preservation, current-main ancestry and gh flag availability: PASS')
```

Groups: (1) triggers, pinned actions, registry auth, permissions and PR payload;
(2) unchanged/changed/unexpected tracked-file gates; (3) existing review branch,
unsigned API commit and successful PR control flow; (4) verifier positive/negative
acceptance and failure modes; (5) preserved lock/test/scan data, CLI flags and base
ancestry. All five groups passed. YAML and embedded bash syntax also passed.

### Hosted acceptance still required

After this workflow is available on main, manually dispatch Refresh Writers
lockfile on main. All install/lint/typecheck/test/build steps must pass before a
PR is opened. Review the npm-generated lock and signature, then trigger required
PR checks as documented in .github/BUILD.md. Merge only after normal owner review
and protections. Verify a trusted-main provenance run including both rejection
checks. This session neither dispatches those workflows nor changes admin settings.

## §4 MEMORY INGEST

Payload: .bits/out/DISP-BUILD-writers/memory.json.
Cumulative Type A: 22; Type B: 52; Type C: 7.
IOO compliance: true; DKG orphans: 0.
Historical failures remain events; current results supersede earlier assumptions
about the impossibility of publishing a new PR in this session.
Verify: `python -m json.tool .bits/out/DISP-BUILD-writers/memory.json`.
No direct memory ingestion is performed.

## §5 CKET FILING

04_HYPOTHESIZE: existing build SRS updated.
11_COMMIT: manual workflow, BUILD.md, provenance additions and dispatch/evidence.
The previous build configuration and source lint comment are already in main;
this continuation does not reintroduce them. Both new files have CGRF headers;
the existing memory JSON uses its sibling envelope. Logical stages use the
existing repository layout. REFLEX remains deferred to private post-merge tooling.

## §6 GOVERNANCE

Entity: Citadel Nexus Inc. (Delaware C-Corp).
License posture: unchanged. CK/CAPS/CKS: pending.
No prod/deploy, direct push, settings or secret changes occurred.
The operator explicitly authorizes the generated workflow to create only
bits/lockfile-refresh and its PR after successful checks; it does not auto-merge.
GitHub API commit signatures must be verified. No signing keys are created.
Scope/credential-prefix checks passed. Stripe mode: not applicable.
Tests and coverage gates remain byte-identical; security scanning is unchanged.
Suggested labels: bits:codegen, srs:srs-cn-writers-build-001,
dispatch:disp-build-writers, verified:static-only, verified:manual-review.
Do not apply verified:tests-pass.

## §7 NEXT ACTIONS

- Use Create/Update PR in this session for the new continuation diff. PR creation
  is external to the coding tools; the final branch suffix and PR number are UI-owned.
- The earlier report incorrectly inferred that immutable metadata prevented a
  new PR. The actual UI created and merged PR 21 after PR 20. Current local branch
  ancestry is now aligned to main; no already-merged build commit needs replaying.
- Admin prerequisites and GITHUB_TOKEN PR-trigger limits are documented in BUILD.md.
  Review the fixed branch if a run fails after branch creation; delete it only after
  inspection before retrying. The workflow never overwrites or force-pushes it.
- Run hosted registry resolution and validation, review the generated PR and then
  verify trusted-main provenance. Offline command blockers remain outstanding.
- No handoff, new secret, admin change or out-of-scope issue comment was made.

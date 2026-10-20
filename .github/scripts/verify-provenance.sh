# ─── CGRF Header ──────────────────────────────
# File:         .github/scripts/verify-provenance.sh
# Stage:        11_COMMIT
# SRS:          SRS-CN-WRITERS-BUILD-001
# CAPS:         pending
# CK:           pending
# Dispatch:     DISP-BUILD-writers
# Seat:         BITS-CODEGEN
# Owner:        Citadel Nexus Inc.
# Created:      2026-10-20
# Depends:      .github/workflows/ci.yml
# EnumType:     Workflow
# EnumEdges:    VALIDATES .github/workflows/ci.yml
# DAG Node:     none
# Intent:       Require the exact main workflow signer and reject changed content or a different identity.
# ──────────────────────────────────────────────

set -euo pipefail
: "${GITHUB_REPOSITORY:?repository required}"
: "${GITHUB_SHA:?source SHA required}"
artifact="${1:?artifact required}"
bundle="${2:?attestation bundle required}"
identity="https://github.com/${GITHUB_REPOSITORY}/.github/workflows/ci.yml@refs/heads/main"
policy=(--repo "$GITHUB_REPOSITORY" --bundle "$bundle"
  --cert-oidc-issuer https://token.actions.githubusercontent.com
  --source-ref refs/heads/main --source-digest "$GITHUB_SHA"
  --signer-digest "$GITHUB_SHA" --deny-self-hosted-runners)

# Establish a successful control before interpreting any expected rejection.
gh attestation verify "$artifact" "${policy[@]}" --cert-identity "$identity"
tampered="$(mktemp)"
trap 'rm -f "$tampered"' EXIT
cp "$artifact" "$tampered"
printf '\nintentional-tamper\n' >> "$tampered"
if gh attestation verify "$tampered" "${policy[@]}" --cert-identity "$identity"; then
  echo 'FAIL: tampered artifact was accepted' >&2
  exit 1
fi
if gh attestation verify "$artifact" "${policy[@]}" \
  --cert-identity "https://github.com/${GITHUB_REPOSITORY}/.github/workflows/untrusted.yml@refs/heads/main"; then
  echo 'FAIL: wrong signer identity was accepted' >&2
  exit 1
fi
# Repeat the valid control so infrastructure failures cannot silently pass the gate.
gh attestation verify "$artifact" "${policy[@]}" --cert-identity "$identity"
echo 'PASS: valid artifact accepted; tamper and wrong signer rejected'

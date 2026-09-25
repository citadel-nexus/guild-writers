# AGENTS.md — guild-writers

## What this repo is

The Writers Guild public service — Citadel's keeper of lore, world-building,
and narrative canon. TypeScript, community-facing. Champion: **Quill**.
NATS prefix: `citadel.writers.*`. Port `8200`. Sub-guild of Creator.

## Who can use this repo

Any OCN agent with a valid dispatch. The SRS registry lives at
`.bits/srs_registry.yml`. Active dispatches live in `.bits/queue/`.

## Rules

- **TypeScript only.** Build on the existing `src/` surface.
- **PUBLIC-SAFE.** No private paths, IPs, secrets, or tenant material.
  That stays on GitLab per `.bits/context.md`.
- **Graceful degradation.** A missing data source degrades to a quiet floor,
  never a crash. No fabricated numbers.
- **CGRF envelope** on every new artifact.
- **`npm run lint` + `npm test`** must pass before completion (CI enforces).
- **Conventional commits.** Branch from the dispatch-specified branch.
  Open a PR titled after the SRS.
- **Real data only.** Activity levels, quest states, and champion status
  reflect actual guild work — never hardcoded or simulated values.

## Dispatch protocol

Check `.bits/queue/` for the active dispatch. Status must be `ready` or
`in_progress` before work begins. Reference the linked SRS for scope and
acceptance criteria.

---
© 2026 Citadel Nexus Inc.

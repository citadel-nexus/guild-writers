# Guild: Writers

> *"The pen outlasts the sword. The story outlasts the empire."*

The Writers Guild is the keeper of Citadel lore — novels, campaign settings,
world-building documents, and the narrative canon that ties all guilds together.
Writers turn RPG sessions into history, and history into publishable books.

---

## Identity

| | |
|---|---|
| **Sigil** | The Quill and Scroll |
| **Vibe** | Patient. Precise. The sentence that makes the reader stop and re-read it. |
| **Color** | Warm Amber `#D4860B` |
| **NATS Prefix** | `citadel.writer.*` |
| **Port** | `8200` |
| **Parent Guild** | Creator → Entertainment |
| **Sub-guild of** | Creator |

---

## Purpose

- Produce **canonical lore** from RPG session data (via `lore-compile`)
- Maintain the **world bible** — factions, history, geography, characters
- Export lore batches to the **book pipeline** (`lore-export` → `book_sessions`)
- Collaborate with the Creator Guild on art direction and narrative arcs
- Generate **Sentinel posts** — in-universe news dispatches for the Guild House feed
- Archive all canonical writing in Notion + Supabase `lore_entries`

---

## Domains of Operation

### Lore Lifecycle
```
1. RPG session recorded in rpg_sessions (Supabase)
2. lore-compile <session_id> → structured lore entry
3. Human review + revision
4. lore-export --lore-ids [...] --book-title "..." → book_sessions queue
5. Book pipeline → manuscript → publish
```

### World Bible Sections
| Section | Contents |
|---------|----------|
| Factions | 8 guilds + sub-factions, histories, rivalries |
| Geography | The Citadel, districts, vaults, the Arena |
| Characters | Key NPCs, recurring figures, guild leaders |
| Lore Events | Timeline of major canon events |
| Artifacts | Items, technologies, SAKE files as in-world relics |

### Sentinel Dispatch
The Writers Guild scripts the **Sentinel AI** in-universe voice — weekly dispatches
to the Guild House feed written as if from inside the world.

---

## Services & Integrations

| Service | Role |
|---------|------|
| **Supabase** | `lore_entries`, `rpg_sessions`, `book_sessions` |
| **Notion** | Blueprint docs, world bible pages |
| **Discord** | `#lore-drops`, `#writers-room` channels |
| **NATS** | `citadel.writer.*` event subjects |
| **ElevenLabs** | Narrated lore audio (voice-over pipeline) |

---

## NATS Event Subjects

```
citadel.writer.lore.compiled        — Session → lore entry complete
citadel.writer.lore.exported        — Batch queued for book pipeline
citadel.writer.dispatch.posted      — Sentinel dispatch published
citadel.writer.draft.submitted      — Draft ready for editorial review
citadel.writer.canon.updated        — World bible entry modified
```

---

## Mission System

Writers missions reward canonical contributions, editorial quality, and narrative worldbuilding.

| Mission | Description | XP | Unlock |
|---------|-------------|-----|--------|
| First Draft | Submit your first lore draft for editorial review | 100 | Default |
| Sentinel Post | Publish a Sentinel dispatch to the Guild House | 100 | Default |
| World Bible | Complete a World Bible section (faction, location, etc.) | 250 | Writer rank |
| Book Export | Export a full lore batch through the book pipeline | 400 | Chronicler rank |
| Canon Merge | Get a lore entry merged to canonical `main` | 200 | Writer rank |
| Voice Script | Write an ElevenLabs narration script (approved) | 150 | Writer rank |
| Arc Complete | Complete a 5-entry narrative arc in the lore canon | 600 | Loremaster rank |

**Daily missions (reset 00:00 UTC):**
- Emit a `citadel.writer.lore.compiled` event — 25 XP
- Post a Sentinel dispatch in the Guild House feed — 30 XP

Writers guild XP feeds the Creator guild's lore pipeline. High-quality canon entries
earn bonus TP and can unlock Loremaster rank perks (priority placement in book pipeline).

---

## Guild Expectations

**Members:**
- At least 1 lore submission or World Bible contribution per sprint
- All canonical lore must pass editorial review before merge (no self-merge)
- Complete Writers onboarding (lore pipeline + World Bible primer) within 7 days
- Engage in `#writers-room` and `#lore-drops` lobby channels

**Contributors:**
- Lore entries must reference a session ID from `rpg_sessions`
- World Bible edits require a summary of what canon was changed in the PR description
- ElevenLabs scripts must be reviewed for tone consistency with the Citadel voice
- Code review turnaround: 48 hours — editorial feedback within 24 hours

**Guild Lead (Chronicler Prime):**
- Weekly lore digest posted to `#announcements`
- Coordinate World Bible consistency with Creator guild
- Manage book pipeline export schedule and manuscript version control

---

## Contributing

**Branch naming:**
```
feat/<srs-code>/<short-description>
lore/<srs-code>/<short-description>
canon/<srs-code>/<short-description>
```

**PR checklist:**
- [ ] SRS code referenced (e.g., `SRS: WRT-LORE-006`)
- [ ] `npm test` passes
- [ ] Lore entry references a valid `rpg_sessions` ID
- [ ] Canon changes summarized in PR description
- [ ] No player real names — use character names only

**Commit format:** `<type>(<srs-code>): <description>`
Example: `lore(WRT-LORE-006): add The Vault War to timeline canon`

**SAKE compliance:** New narrative pipeline modules require a `.sake` file stub.
See [guild-sdk](https://github.com/citadel-nexus/guild-sdk) for the format.

---

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

```
NATS_URL=nats://<your-nats-host>:4222
SUPABASE_SERVICE_ROLE_KEY=<key>
NOTION_API_TOKEN=<key>
ELEVENLABS_API_KEY=<key>
GUILD_PORT=8200
```

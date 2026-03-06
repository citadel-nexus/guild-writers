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

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

```
NATS_URL=nats://147.93.43.117:4222
SUPABASE_SERVICE_ROLE_KEY=<key>
NOTION_API_TOKEN=<key>
ELEVENLABS_API_KEY=<key>
GUILD_PORT=8200
```

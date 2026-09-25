// ─── CGRF Header ──────────────────────────────
// File:        src/livingworld/state.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/livingworld/contracts.ts
// EnumType:    Service
// EnumEdges:   CONSUMES src/livingworld/contracts.ts; PRODUCES src/routes/realm.ts; PRODUCES src/routes/party.ts
// DAG Node:    writers.livingworld.state
// Intent:      Preserve only validated public floor state and default missing sources to a quiet floor.
// ──────────────────────────────────────────────

import {
  WRITERS_CHAMPION,
  WRITERS_GUILD,
  type ChampionState,
  type PublicQuest,
  type QuestState,
  type WritersPartyFeed,
  type WritersRealmFeed,
} from './contracts.js';

const PUBLIC_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CHAMPION_STATES = new Set<ChampionState>(['idle', 'working', 'blocked']);
const QUIET_ACTIVITY_LEVEL = 0;

export interface QuestChange {
  id: string;
  title: string;
  state: QuestState;
}

export interface StateChange<T> {
  changed: boolean;
  value: T;
}

function normalizeActivityLevel(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return QUIET_ACTIVITY_LEVEL;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeQuest(change: QuestChange): PublicQuest | null {
  const id = change.id.trim();
  if (!PUBLIC_ID_PATTERN.test(id)) {
    return null;
  }

  const title = change.title
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  if (title.length === 0) {
    return null;
  }

  return { id, title, state: change.state };
}

export class LivingWorldState {
  private activityLevel = QUIET_ACTIVITY_LEVEL;
  private championState: ChampionState = 'idle';
  private readonly quests = new Map<string, PublicQuest>();

  /** Apply a source-derived heartbeat, falling back to quiet for missing input. */
  updateActivity(value: unknown): number {
    this.activityLevel = normalizeActivityLevel(value);
    return this.activityLevel;
  }

  /** Apply a validated public quest transition. */
  updateQuest(change: QuestChange): StateChange<PublicQuest | null> {
    const normalized = normalizeQuest(change);
    if (normalized === null) {
      return { changed: false, value: null };
    }

    const previous = this.quests.get(normalized.id);
    const changed =
      previous === undefined ||
      previous.title !== normalized.title ||
      previous.state !== normalized.state;

    if (changed) {
      this.quests.set(normalized.id, normalized);
    }

    return { changed, value: { ...normalized } };
  }

  /** Transition Quill to a valid state, defaulting invalid input to idle. */
  updateChampion(value: unknown): StateChange<ChampionState> {
    const next = CHAMPION_STATES.has(value as ChampionState)
      ? (value as ChampionState)
      : 'idle';
    const changed = next !== this.championState;
    this.championState = next;
    return { changed, value: next };
  }

  /** Return the non-secret floor snapshot consumed by the game. */
  realmFeed(): WritersRealmFeed {
    return {
      guild: WRITERS_GUILD,
      champion: WRITERS_CHAMPION,
      activity_level: this.activityLevel,
      quests: [...this.quests.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((quest) => ({ ...quest })),
      structures: [{ kind: 'hall', level: 1 }],
    };
  }

  /** Return Quill's public guildmaster binding for the party feed. */
  partyFeed(): WritersPartyFeed {
    return {
      guild: WRITERS_GUILD,
      party: [
        {
          id: 'quill',
          name: WRITERS_CHAMPION,
          role: 'guildmaster',
          guild: WRITERS_GUILD,
          floor: WRITERS_GUILD,
          state: this.championState,
        },
      ],
    };
  }
}

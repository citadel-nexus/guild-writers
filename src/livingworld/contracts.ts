// ─── CGRF Header ──────────────────────────────
// File:        src/livingworld/contracts.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     .bits/srs/SRS-CN-WRITERS-LIVINGWORLD-001.md
// EnumType:    Schema
// EnumEdges:   EXTENDS SRS-CN-WRITERS-LIVINGWORLD-001; PRODUCES citadel.writers.activity; PRODUCES citadel.writers.quest; PRODUCES citadel.writers.champion
// DAG Node:    writers.livingworld.contracts
// Intent:      Define one public-safe schema for the Writers floor feeds and required NATS events.
// ──────────────────────────────────────────────

export const WRITERS_GUILD = 'writers' as const;
export const WRITERS_CHAMPION = 'Quill' as const;
export const WRITERS_NATS_PREFIX = 'citadel.writers' as const;

export const WRITERS_SUBJECTS = Object.freeze({
  activity: `${WRITERS_NATS_PREFIX}.activity`,
  quest: `${WRITERS_NATS_PREFIX}.quest`,
  champion: `${WRITERS_NATS_PREFIX}.champion`,
});

export type ChampionState = 'idle' | 'working' | 'blocked';
export type QuestState = 'open' | 'closed';

export interface PublicQuest {
  id: string;
  title: string;
  state: QuestState;
}

export interface RealmStructure {
  kind: 'hall';
  level: 1;
}

export interface WritersRealmFeed {
  guild: typeof WRITERS_GUILD;
  champion: typeof WRITERS_CHAMPION;
  activity_level: number;
  quests: PublicQuest[];
  structures: RealmStructure[];
}

export interface PartyMember {
  id: 'quill';
  name: typeof WRITERS_CHAMPION;
  role: 'guildmaster';
  guild: typeof WRITERS_GUILD;
  floor: typeof WRITERS_GUILD;
  state: ChampionState;
}

export interface WritersPartyFeed {
  guild: typeof WRITERS_GUILD;
  party: PartyMember[];
}

export interface ActivityEvent {
  guild: typeof WRITERS_GUILD;
  activity_level: number;
  method: string;
  observed_at: string;
}

export interface QuestEvent {
  guild: typeof WRITERS_GUILD;
  quest: PublicQuest;
  observed_at: string;
}

export interface ChampionEvent {
  guild: typeof WRITERS_GUILD;
  champion: typeof WRITERS_CHAMPION;
  state: ChampionState;
  observed_at: string;
}

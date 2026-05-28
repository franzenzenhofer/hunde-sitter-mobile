import type { DogStats } from '../entities/dog-stats';
import type { QuestState } from '../quests/types';

export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'hs:save:v2';

export type Association = {
  strength: number;
  reinforcements: number;
  lastReinforcedAt: number;
};

export type Program = {
  nodeId: string;
  args?: Record<string, number>;
  children?: Program[];
};

export type Trick = {
  id: string;
  name: string;
  cueGestureId?: string;
  program: Program;
  mastery: number;
  attempts: number;
  successes: number;
  reinforcements: number;
  authoredBy: 'system' | 'player';
  createdAt: number;
};

export type SaveV2 = {
  v: 2;
  seed: number;
  player: { x: number; z: number };
  stats: DogStats;
  quest: QuestState;
  completedQuests: number;
  tricks: Record<string, Trick>;
  vocabulary: Record<string, Record<string, Association>>;
  ballInventory: Record<string, number>;
  memoryCells: Record<number, number>;
  ts: number;
};

export type SaveV1 = {
  v: 1;
  seed: number;
  player: { x: number; z: number };
  stats: DogStats;
  quest: QuestState;
  completedQuests: number;
  ts: number;
};

export function isSaveV1(value: unknown): value is SaveV1 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SaveV1>;
  return (
    v.v === 1 &&
    typeof v.seed === 'number' &&
    !!v.player &&
    typeof v.player.x === 'number' &&
    typeof v.player.z === 'number' &&
    !!v.stats &&
    !!v.quest
  );
}

export function isSaveV2(value: unknown): value is SaveV2 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SaveV2>;
  return (
    v.v === 2 &&
    typeof v.seed === 'number' &&
    !!v.player &&
    !!v.stats &&
    !!v.quest &&
    !!v.tricks &&
    !!v.vocabulary &&
    !!v.ballInventory &&
    !!v.memoryCells
  );
}

export function migrateV1toV2(old: SaveV1): SaveV2 {
  return {
    v: 2,
    seed: old.seed,
    player: { ...old.player },
    stats: { ...old.stats },
    quest: { ...old.quest },
    completedQuests: old.completedQuests,
    tricks: {},
    vocabulary: {},
    ballInventory: {},
    memoryCells: {},
    ts: old.ts,
  };
}

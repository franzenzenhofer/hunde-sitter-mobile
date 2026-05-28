import { BIOMES, type BiomeId } from '../world/biomes';
import type { QuestState, QuestKind } from './types';

type Template = (rng: () => number) => QuestState;

const BIOME_IDS = Object.keys(BIOMES) as BiomeId[];

let counter = 0;

function nextId(kind: QuestKind): string {
  return `${kind}-${++counter}`;
}

const templates: Template[] = [
  (rng) => {
    const goal = 3 + Math.floor(rng() * 4);
    return { id: nextId('pet'), kind: 'pet', label: `Pet Bello ${goal} times`, goal, progress: 0 };
  },
  (rng) => {
    const goal = 2 + Math.floor(rng() * 3);
    return { id: nextId('throw'), kind: 'throw', label: `Throw the ball ${goal} times`, goal, progress: 0 };
  },
  (rng) => {
    const goal = 2 + Math.floor(rng() * 3);
    return { id: nextId('feed'), kind: 'feed', label: `Feed Bello ${goal} treats`, goal, progress: 0 };
  },
  (rng) => {
    const idx = Math.floor(rng() * BIOME_IDS.length);
    const biome = BIOME_IDS[idx] ?? 'meadow';
    return {
      id: nextId('visit'),
      kind: 'visit',
      label: `Visit the ${BIOMES[biome].name}`,
      goal: 1,
      progress: 0,
      biome,
    };
  },
  (rng) => {
    const goal = 30 + Math.floor(rng() * 60);
    return { id: nextId('walk'), kind: 'walk', label: `Walk ${goal} steps`, goal, progress: 0 };
  },
];

export function rollQuest(rng: () => number, avoidKind?: QuestKind): QuestState {
  const pool = templates.filter((_, i) => kindOf(i) !== avoidKind);
  const pick = pool[Math.floor(rng() * pool.length)] ?? templates[0]!;
  return pick(rng);
}

function kindOf(index: number): QuestKind {
  return (['pet', 'throw', 'feed', 'visit', 'walk'] as const)[index] ?? 'pet';
}

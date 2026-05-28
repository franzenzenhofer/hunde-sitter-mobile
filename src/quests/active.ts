import { emit, on } from '../core/bus';
import type { QuestState } from './types';
import { rollQuest } from './templates';
import { mulberry32 } from '../world/rng';
import type { Vector3 } from 'three';

const WALK_STEP = 1;

export type ActiveQuests = {
  current: QuestState;
  walkProgress(player: Vector3): void;
  destroy(): void;
};

export function createActiveQuests(seed: number): ActiveQuests {
  const rng = mulberry32(seed + 0xa11ce);
  const state: ActiveQuests = {
    current: rollQuest(rng),
    walkProgress: () => undefined,
    destroy: () => undefined,
  };
  let lastPos: Vector3 | null = null;

  const advance = (n: number): void => {
    state.current.progress = Math.min(state.current.goal, state.current.progress + n);
    if (state.current.progress >= state.current.goal) {
      emit('quest:complete', { id: state.current.id });
      state.current = rollQuest(rng, state.current.kind);
    }
  };

  const unsubs = [
    on('dog:petted', () => state.current.kind === 'pet' && advance(1)),
    on('dog:played', () => state.current.kind === 'throw' && advance(1)),
    on('dog:fed', () => state.current.kind === 'feed' && advance(1)),
    on('biome:enter', ({ biome }) => {
      if (state.current.kind === 'visit' && state.current.biome === biome) advance(1);
    }),
  ];

  state.walkProgress = (p): void => {
    if (state.current.kind !== 'walk') {
      lastPos = p.clone();
      return;
    }
    if (!lastPos) {
      lastPos = p.clone();
      return;
    }
    const d = p.distanceTo(lastPos);
    if (d >= WALK_STEP) {
      advance(Math.floor(d / WALK_STEP));
      lastPos.copy(p);
    }
  };
  state.destroy = () => unsubs.forEach((u) => u());
  return state;
}

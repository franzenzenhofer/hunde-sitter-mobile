import type { Player } from '../entities/player';
import type { Dog } from '../entities/dog';
import type { ActiveQuests } from '../quests/active';
import type { QuestState } from '../quests/types';
import type { SaveV2, Trick, Association } from './schema';

export type SnapshotInputs = {
  seed: number;
  player: Player;
  dog: Dog;
  quest: QuestState;
  completedQuests: number;
  tricks: Record<string, Trick>;
  vocabulary: Record<string, Record<string, Association>>;
  ballInventory: Record<string, number>;
  memoryCells: Record<number, number>;
};

export function snapshot(inputs: SnapshotInputs): SaveV2 {
  return {
    v: 2,
    seed: inputs.seed,
    player: { x: inputs.player.group.position.x, z: inputs.player.group.position.z },
    stats: { ...inputs.dog.stats },
    quest: { ...inputs.quest },
    completedQuests: inputs.completedQuests,
    tricks: structuredClone(inputs.tricks),
    vocabulary: structuredClone(inputs.vocabulary),
    ballInventory: { ...inputs.ballInventory },
    memoryCells: { ...inputs.memoryCells },
    ts: Date.now(),
  };
}

export function restoreState(
  save: SaveV2,
  refs: { player: Player; dog: Dog; quests: ActiveQuests },
): void {
  refs.player.group.position.set(save.player.x, 0, save.player.z);
  refs.dog.stats.hunger = save.stats.hunger;
  refs.dog.stats.fun = save.stats.fun;
  refs.dog.stats.love = save.stats.love;
  refs.quests.current = { ...save.quest };
}

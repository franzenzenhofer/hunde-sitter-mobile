import type { DogStats } from '../entities/dog-stats';
import { clamp } from '../entities/dog-stats';

export function grantReward(stats: DogStats): void {
  stats.hunger = clamp(stats.hunger + 20);
  stats.fun = clamp(stats.fun + 20);
  stats.love = clamp(stats.love + 20);
}

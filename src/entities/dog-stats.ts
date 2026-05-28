export type DogStats = {
  hunger: number;
  fun: number;
  love: number;
};

const DECAY = { hunger: 0.6, fun: 0.5, love: 0.4 };

export function newStats(): DogStats {
  return { hunger: 80, fun: 80, love: 80 };
}

export function decayStats(s: DogStats, dt: number): void {
  s.hunger = clamp(s.hunger - DECAY.hunger * dt);
  s.fun = clamp(s.fun - DECAY.fun * dt);
  s.love = clamp(s.love - DECAY.love * dt);
}

export function happiness(s: DogStats): number {
  return (s.hunger + s.fun + s.love) / 3;
}

export function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

import { describe, it, expect } from 'vitest';
import { newStats, decayStats, happiness, clamp } from '../../src/entities/dog-stats';

describe('dog-stats', () => {
  it('starts at 80 across stats', () => {
    const s = newStats();
    expect(s).toEqual({ hunger: 80, fun: 80, love: 80 });
  });

  it('decays over time and clamps at 0', () => {
    const s = newStats();
    decayStats(s, 1000);
    expect(s.hunger).toBe(0);
    expect(s.fun).toBe(0);
    expect(s.love).toBe(0);
  });

  it('happiness averages stats', () => {
    expect(happiness({ hunger: 60, fun: 60, love: 90 })).toBe(70);
  });

  it('clamp keeps values within 0-100', () => {
    expect(clamp(150)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(42)).toBe(42);
  });
});

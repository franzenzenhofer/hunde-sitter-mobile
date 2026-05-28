import { describe, it, expect } from 'vitest';
import { mulberry32, hashSeed, rngFor } from '../../src/world/rng';

describe('rng', () => {
  it('same seed produces same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 8; i++) expect(a()).toBeCloseTo(b());
  });

  it('different seeds diverge', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBeCloseTo(b());
  });

  it('outputs are within [0,1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hashSeed is deterministic per (seed,x,z)', () => {
    expect(hashSeed(1, 2, 3)).toBe(hashSeed(1, 2, 3));
    expect(hashSeed(1, 2, 3)).not.toBe(hashSeed(1, 3, 2));
  });

  it('rngFor produces deterministic streams', () => {
    const a = rngFor(1, 5, 5);
    const b = rngFor(1, 5, 5);
    expect(a()).toBe(b());
  });
});

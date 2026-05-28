import { describe, it, expect } from 'vitest';
import { resolveBiome, BIOMES } from '../../src/world/biomes';

describe('biomes', () => {
  it('hot dry => beach', () => {
    expect(resolveBiome(0.8, 0.2).id).toBe('beach');
  });

  it('cold dry => mountain', () => {
    expect(resolveBiome(0.2, 0.2).id).toBe('mountain');
  });

  it('wet => forest', () => {
    expect(resolveBiome(0.5, 0.85).id).toBe('forest');
  });

  it('warm mid-moisture => village', () => {
    expect(resolveBiome(0.6, 0.5).id).toBe('village');
  });

  it('default => meadow', () => {
    expect(resolveBiome(0.45, 0.45).id).toBe('meadow');
  });

  it('all biomes registered', () => {
    expect(Object.keys(BIOMES)).toEqual(['meadow', 'forest', 'beach', 'mountain', 'village']);
  });
});

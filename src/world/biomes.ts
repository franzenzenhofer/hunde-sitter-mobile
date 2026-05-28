export type BiomeId = 'meadow' | 'forest' | 'beach' | 'mountain' | 'village';

export type Biome = {
  id: BiomeId;
  name: string;
  ground: number;
  scatter: ReadonlyArray<{ kind: ScatterKind; density: number }>;
};

export type ScatterKind = 'flower' | 'tree-leafy' | 'tree-pine' | 'rock' | 'house' | 'shrub';

export const BIOMES: Readonly<Record<BiomeId, Biome>> = {
  meadow: {
    id: 'meadow',
    name: 'Meadow',
    ground: 0x6bbf5a,
    scatter: [
      { kind: 'flower', density: 0.06 },
      { kind: 'tree-leafy', density: 0.012 },
      { kind: 'shrub', density: 0.02 },
    ],
  },
  forest: {
    id: 'forest',
    name: 'Pinewood',
    ground: 0x3f7a3a,
    scatter: [
      { kind: 'tree-pine', density: 0.07 },
      { kind: 'tree-leafy', density: 0.025 },
      { kind: 'shrub', density: 0.03 },
    ],
  },
  beach: {
    id: 'beach',
    name: 'Sunlit Cove',
    ground: 0xf0d18a,
    scatter: [
      { kind: 'rock', density: 0.02 },
      { kind: 'shrub', density: 0.008 },
    ],
  },
  mountain: {
    id: 'mountain',
    name: 'Cliffside',
    ground: 0x8a8175,
    scatter: [
      { kind: 'rock', density: 0.05 },
      { kind: 'tree-pine', density: 0.015 },
    ],
  },
  village: {
    id: 'village',
    name: 'Old Hamlet',
    ground: 0xc6a47e,
    scatter: [
      { kind: 'house', density: 0.012 },
      { kind: 'tree-leafy', density: 0.018 },
      { kind: 'flower', density: 0.03 },
    ],
  },
};

export function resolveBiome(temperature: number, moisture: number): Biome {
  if (temperature > 0.65 && moisture < 0.35) return BIOMES.beach;
  if (temperature < 0.35 && moisture < 0.4) return BIOMES.mountain;
  if (moisture > 0.65) return BIOMES.forest;
  if (temperature > 0.55 && moisture > 0.45 && moisture < 0.6) return BIOMES.village;
  return BIOMES.meadow;
}

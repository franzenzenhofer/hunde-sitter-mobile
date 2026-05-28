export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(seed: number, x: number, z: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (x | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (z | 0), 0xc2b2ae35) >>> 0;
  return h >>> 0;
}

export function rngFor(seed: number, x: number, z: number): Rng {
  return mulberry32(hashSeed(seed, x, z));
}

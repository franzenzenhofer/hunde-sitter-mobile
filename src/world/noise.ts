import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import { mulberry32 } from './rng';

export type WorldNoise = {
  temperature(x: number, z: number): number;
  moisture(x: number, z: number): number;
  detail(x: number, z: number): number;
};

const TEMP_SCALE = 0.012;
const MOIST_SCALE = 0.018;
const DETAIL_SCALE = 0.25;

function unit(n: NoiseFunction2D, x: number, z: number, scale: number): number {
  return (n(x * scale, z * scale) + 1) * 0.5;
}

export function createWorldNoise(seed: number): WorldNoise {
  const t = createNoise2D(mulberry32(seed));
  const m = createNoise2D(mulberry32(seed + 0x9e3779b9));
  const d = createNoise2D(mulberry32(seed + 0x7f4a7c15));
  return {
    temperature: (x, z) => unit(t, x, z, TEMP_SCALE),
    moisture: (x, z) => unit(m, x, z, MOIST_SCALE),
    detail: (x, z) => unit(d, x, z, DETAIL_SCALE),
  };
}

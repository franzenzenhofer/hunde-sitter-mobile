import { Group } from 'three';
import { resolveBiome, type Biome } from './biomes';
import { rngFor } from './rng';
import { buildDecoration } from './decorations';
import { buildTerrain, heightAt } from './terrain';
import { buildWaterPlane } from './water-plane';
import type { WorldNoise } from './noise';

export const CHUNK_SIZE = 32;

export type ChunkTicker = (dt: number) => void;

export type PickupSpawn = {
  kind: 'ball' | 'treat';
  x: number;
  z: number;
};

export type Chunk = {
  cx: number;
  cz: number;
  group: Group;
  biome: Biome;
  tickers: ChunkTicker[];
  pickups: PickupSpawn[];
};

const ORIGIN_CLEAR_RADIUS_SQ = 5 * 5;
const PICKUPS_PER_CHUNK = 3;

export function buildChunk(seed: number, cx: number, cz: number, noise: WorldNoise): Chunk {
  const wx = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
  const wz = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
  const biome = resolveBiome(noise.temperature(wx, wz), noise.moisture(wx, wz));

  const group = new Group();
  group.name = `chunk:${cx},${cz}`;
  group.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
  group.add(buildTerrain(noise, biome, cx, cz));

  const tickers: ChunkTicker[] = [];
  if (biome.id === 'beach') {
    const water = buildWaterPlane();
    group.add(water.mesh);
    tickers.push(water.update);
  }

  const rng = rngFor(seed, cx, cz);
  scatterDecorations(group, rng, cx, cz, biome, noise);
  const pickups = pickupPositions(rng, cx, cz);
  return { cx, cz, group, biome, tickers, pickups };
}

function scatterDecorations(
  group: Group,
  rng: () => number,
  cx: number,
  cz: number,
  biome: Biome,
  noise: WorldNoise,
): void {
  for (const entry of biome.scatter) {
    const count = Math.round(entry.density * CHUNK_SIZE * CHUNK_SIZE);
    for (let i = 0; i < count; i++) {
      const lx = rng() * CHUNK_SIZE;
      const lz = rng() * CHUNK_SIZE;
      if (isNearOrigin(cx, cz, lx, lz)) continue;
      const wxLocal = cx * CHUNK_SIZE + lx;
      const wzLocal = cz * CHUNK_SIZE + lz;
      const y = Math.max(0.05, heightAt(noise, biome, wxLocal, wzLocal));
      const node = buildDecoration(entry.kind, rng);
      node.position.set(lx, y, lz);
      node.rotation.y = rng() * Math.PI * 2;
      group.add(node);
    }
  }
}

function pickupPositions(rng: () => number, cx: number, cz: number): PickupSpawn[] {
  const out: PickupSpawn[] = [];
  for (let i = 0; i < PICKUPS_PER_CHUNK; i++) {
    const lx = rng() * CHUNK_SIZE;
    const lz = rng() * CHUNK_SIZE;
    if (isNearOrigin(cx, cz, lx, lz)) continue;
    out.push({
      kind: rng() < 0.55 ? 'ball' : 'treat',
      x: cx * CHUNK_SIZE + lx,
      z: cz * CHUNK_SIZE + lz,
    });
  }
  return out;
}

function isNearOrigin(cx: number, cz: number, lx: number, lz: number): boolean {
  if (cx !== 0 || cz !== 0) return false;
  const dx = lx - CHUNK_SIZE / 2;
  const dz = lz - CHUNK_SIZE / 2;
  return dx * dx + dz * dz < ORIGIN_CLEAR_RADIUS_SQ;
}

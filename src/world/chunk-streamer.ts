import type { Object3D, Scene, Vector3 } from 'three';
import { buildChunk, CHUNK_SIZE, type Chunk } from './chunk';
import { createWorldNoise, type WorldNoise } from './noise';
import { emit } from '../core/bus';
import { resolveBiome } from './biomes';
import { heightAt } from './terrain';

const RADIUS = 2;

export type StreamerHooks = {
  onChunkLoad?: (chunk: Chunk) => void;
};

export type Streamer = {
  update(player: Vector3, dt: number): void;
  groundHeight(x: number, z: number): number;
  noise: WorldNoise;
};

export function createStreamer(seed: number, scene: Scene, hooks: StreamerHooks = {}): Streamer {
  const noise = createWorldNoise(seed);
  const loaded = new Map<string, Chunk>();
  let lastCenter = '';
  let lastBiome = '';

  const key = (x: number, z: number): string => `${x},${z}`;
  const playerChunk = (p: Vector3): { cx: number; cz: number } => ({
    cx: Math.floor(p.x / CHUNK_SIZE),
    cz: Math.floor(p.z / CHUNK_SIZE),
  });

  const dispose = (c: Chunk): void => {
    c.group.traverse((o: Object3D) => {
      const m = o as Object3D & { geometry?: { dispose(): void } };
      m.geometry?.dispose();
    });
    scene.remove(c.group);
  };

  return {
    noise,
    update: (player, dt) => {
      const { cx, cz } = playerChunk(player);
      const centerKey = key(cx, cz);
      if (centerKey !== lastCenter) {
        lastCenter = centerKey;
        const wanted = new Set<string>();
        for (let dz = -RADIUS; dz <= RADIUS; dz++) {
          for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            const k = key(cx + dx, cz + dz);
            wanted.add(k);
            if (!loaded.has(k)) {
              const chunk = buildChunk(seed, cx + dx, cz + dz, noise);
              scene.add(chunk.group);
              loaded.set(k, chunk);
              hooks.onChunkLoad?.(chunk);
            }
          }
        }
        for (const [k, chunk] of loaded) {
          if (!wanted.has(k)) {
            dispose(chunk);
            loaded.delete(k);
          }
        }
      }
      for (const chunk of loaded.values()) {
        for (const fn of chunk.tickers) fn(dt);
      }
      const biome = resolveBiome(noise.temperature(player.x, player.z), noise.moisture(player.x, player.z));
      if (biome.id !== lastBiome) {
        lastBiome = biome.id;
        emit('biome:enter', { biome: biome.id });
      }
    },
    groundHeight: (x, z) => {
      const biome = resolveBiome(noise.temperature(x, z), noise.moisture(x, z));
      return Math.max(0, heightAt(noise, biome, x, z));
    },
  };
}

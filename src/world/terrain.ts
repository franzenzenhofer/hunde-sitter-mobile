import { Mesh, PlaneGeometry } from 'three';
import { toon } from '../render/toon-material';
import type { Biome } from './biomes';
import type { WorldNoise } from './noise';

const HEIGHT_SCALE = 0.02;
const SEGMENTS = 16;
const SIZE = 32;

const AMP: Record<string, number> = {
  meadow: 0.6,
  forest: 1.0,
  beach: 0.15,
  mountain: 3.0,
  village: 0.4,
};

export function heightAt(noise: WorldNoise, biome: Biome, wx: number, wz: number): number {
  const n = (noise.detail(wx, wz) + noise.temperature(wx, wz)) * 0.5;
  const amp = AMP[biome.id] ?? 0.6;
  return Math.sin(wx * HEIGHT_SCALE) * 0.2 + (n - 0.5) * amp * 2;
}

export function buildTerrain(noise: WorldNoise, biome: Biome, cx: number, cz: number): Mesh {
  const geo = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  if (!pos) throw new Error('terrain: missing position attribute');
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const wx = cx * SIZE + SIZE / 2 + lx;
    const wz = cz * SIZE + SIZE / 2 + lz;
    pos.setY(i, heightAt(noise, biome, wx, wz));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mesh = new Mesh(geo, toon(biome.ground));
  mesh.position.set(SIZE / 2, 0, SIZE / 2);
  mesh.receiveShadow = true;
  return mesh;
}

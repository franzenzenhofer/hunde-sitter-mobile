import { BoxGeometry, Group, Mesh } from 'three';
import { toon } from '../render/toon-material';
import type { ScatterKind } from './biomes';

const FLOWER_COLORS = [0xff6b9d, 0xffd86b, 0xff9a5a, 0xb98bff, 0xffffff];

export function buildDecoration(kind: ScatterKind, rng: () => number): Group {
  if (kind === 'flower') return flower(rng);
  if (kind === 'tree-leafy') return treeLeafy(rng);
  if (kind === 'tree-pine') return treePine(rng);
  if (kind === 'rock') return rock(rng);
  if (kind === 'house') return house(rng);
  return shrub(rng);
}

function box(w: number, h: number, d: number, color: number): Mesh {
  return new Mesh(new BoxGeometry(w, h, d), toon(color));
}

function flower(rng: () => number): Group {
  const g = new Group();
  const stem = box(0.05, 0.35, 0.05, 0x3a8a3a);
  stem.position.y = 0.18;
  const idx = Math.floor(rng() * FLOWER_COLORS.length);
  const color = FLOWER_COLORS[idx] ?? FLOWER_COLORS[0]!;
  const head = box(0.2, 0.18, 0.2, color);
  head.position.y = 0.4;
  g.add(stem, head);
  return g;
}

function treeLeafy(rng: () => number): Group {
  const g = new Group();
  const h = 1.2 + rng() * 0.8;
  const trunk = box(0.22, h, 0.22, 0x6b4226);
  trunk.position.y = h / 2;
  const canopySize = 1.2 + rng() * 0.4;
  const canopy = box(canopySize, canopySize, canopySize, 0x5dbf5a);
  canopy.position.y = h + canopySize / 2;
  g.add(trunk, canopy);
  return g;
}

function treePine(rng: () => number): Group {
  const g = new Group();
  const h = 1.8 + rng() * 0.9;
  const trunk = box(0.2, h, 0.2, 0x6b4226);
  trunk.position.y = h / 2;
  for (let i = 0; i < 3; i++) {
    const size = 1.3 - i * 0.3 + rng() * 0.1;
    const layer = box(size, 0.55, size, 0x2f6b3a);
    layer.position.y = h + 0.3 + i * 0.5;
    g.add(layer);
  }
  g.add(trunk);
  return g;
}

function rock(rng: () => number): Group {
  const g = new Group();
  const r = 0.5 + rng() * 0.5;
  const m = box(r, r * 0.7, r, 0x9a958a);
  m.position.y = (r * 0.7) / 2;
  m.rotation.y = rng() * Math.PI * 2;
  g.add(m);
  return g;
}

function house(rng: () => number): Group {
  const g = new Group();
  const w = 1.6 + rng() * 0.4;
  const h = 1.4 + rng() * 0.3;
  const body = box(w, h, w, 0xefe1c4);
  body.position.y = h / 2;
  const roof = box(w * 1.1, 0.45, w * 1.1, 0xc04848);
  roof.position.y = h + 0.22;
  g.add(body, roof);
  return g;
}

function shrub(rng: () => number): Group {
  const g = new Group();
  const r = 0.5 + rng() * 0.3;
  const m = box(r, r * 0.7, r, 0x4f8a3a);
  m.position.y = (r * 0.7) / 2;
  g.add(m);
  return g;
}

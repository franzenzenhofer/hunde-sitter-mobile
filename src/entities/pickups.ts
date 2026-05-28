import { BoxGeometry, Group, Mesh, type Scene, Vector3 } from 'three';
import { toon } from '../render/toon-material';

export type PickupKind = 'ball' | 'treat';

export type Pickup = {
  kind: PickupKind;
  group: Group;
  pos: Vector3;
};

const PICK_RADIUS_SQ = 1.5 * 1.5;

export type PickupBag = {
  spawn(kind: PickupKind, x: number, z: number, scene: Scene): void;
  tryPickup(playerPos: Vector3, scene: Scene): PickupKind | null;
  count(kind: PickupKind): number;
  consume(kind: PickupKind): boolean;
  update(dt: number): void;
};

const STORE: { ball: number; treat: number } = { ball: 0, treat: 0 };

export function createPickupBag(): PickupBag {
  const items: Pickup[] = [];
  let time = 0;
  return {
    spawn: (kind, x, z, scene) => {
      const group = buildPickupMesh(kind);
      group.position.set(x, 0.4, z);
      scene.add(group);
      items.push({ kind, group, pos: group.position });
    },
    tryPickup: (playerPos, scene) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const dx = item.pos.x - playerPos.x;
        const dz = item.pos.z - playerPos.z;
        if (dx * dx + dz * dz < PICK_RADIUS_SQ) {
          scene.remove(item.group);
          item.group.traverse((o) => {
            const m = o as { geometry?: { dispose(): void } };
            m.geometry?.dispose();
          });
          items.splice(i, 1);
          STORE[item.kind]++;
          return item.kind;
        }
      }
      return null;
    },
    count: (kind) => STORE[kind],
    consume: (kind) => {
      if (STORE[kind] <= 0) return false;
      STORE[kind]--;
      return true;
    },
    update: (dt) => {
      time += dt;
      for (const item of items) {
        item.group.position.y = 0.55 + Math.sin(time * 3 + item.pos.x * 0.5) * 0.08;
        item.group.rotation.y += dt * 1.4;
      }
    },
  };
}

function buildPickupMesh(kind: PickupKind): Group {
  const g = new Group();
  if (kind === 'ball') {
    const m = new Mesh(new BoxGeometry(0.32, 0.32, 0.32), toon(0xff6b6b));
    g.add(m);
    const stripe = new Mesh(new BoxGeometry(0.34, 0.06, 0.34), toon(0xffffff));
    g.add(stripe);
  } else {
    const color = 0xf5e6c8;
    const shaft = new Mesh(new BoxGeometry(0.36, 0.1, 0.1), toon(color));
    g.add(shaft);
    for (const x of [-0.2, 0.2]) {
      for (const z of [-0.08, 0.08]) {
        const knob = new Mesh(new BoxGeometry(0.14, 0.14, 0.14), toon(color));
        knob.position.set(x, 0, z);
        g.add(knob);
      }
    }
  }
  return g;
}

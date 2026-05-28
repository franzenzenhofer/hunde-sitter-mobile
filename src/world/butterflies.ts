import { Group, Mesh, PlaneGeometry, type Scene, Vector3 } from 'three';
import { toon } from '../render/toon-material';

const COLORS = [0xffd86b, 0xff9eb5, 0x9beaff, 0xb98bff, 0xfff7b0];
const COUNT = 8;
const RADIUS = 14;
const HEIGHT_MIN = 1.6;
const HEIGHT_MAX = 3.2;

type Butterfly = {
  group: Group;
  wingL: Mesh;
  wingR: Mesh;
  phase: number;
  speed: number;
  target: Vector3;
  pickTimer: number;
};

export type Butterflies = {
  update(dt: number, follow: Vector3): void;
};

export function addButterflies(scene: Scene): Butterflies {
  const list: Butterfly[] = [];
  for (let i = 0; i < COUNT; i++) list.push(make(scene, i));

  return {
    update: (dt, follow) => {
      for (const b of list) {
        b.pickTimer -= dt;
        if (b.pickTimer <= 0 || b.group.position.distanceTo(b.target) < 0.6) {
          b.pickTimer = 2 + Math.random() * 4;
          const a = Math.random() * Math.PI * 2;
          const r = 3 + Math.random() * RADIUS;
          b.target.set(
            follow.x + Math.cos(a) * r,
            HEIGHT_MIN + Math.random() * (HEIGHT_MAX - HEIGHT_MIN),
            follow.z + Math.sin(a) * r,
          );
        }
        const dir = b.target.clone().sub(b.group.position).normalize();
        b.group.position.addScaledVector(dir, b.speed * dt);
        b.group.position.y += Math.sin(b.phase) * dt * 0.6;
        b.phase += dt * 14;
        const flap = Math.sin(b.phase) * 0.9;
        b.wingL.rotation.y = flap;
        b.wingR.rotation.y = -flap;
        b.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
    },
  };
}

function make(scene: Scene, i: number): Butterfly {
  const group = new Group();
  const color = COLORS[i % COLORS.length] ?? 0xffffff;
  const wingL = wing(color);
  const wingR = wing(color);
  wingL.position.x = 0.05;
  wingR.position.x = -0.05;
  wingR.scale.x = -1;
  group.add(wingL, wingR);
  group.position.set((Math.random() - 0.5) * 20, 2 + Math.random(), (Math.random() - 0.5) * 20);
  scene.add(group);
  return {
    group,
    wingL,
    wingR,
    phase: Math.random() * Math.PI * 2,
    speed: 1.4 + Math.random() * 0.8,
    target: group.position.clone(),
    pickTimer: 0,
  };
}

function wing(color: number): Mesh {
  const m = new Mesh(new PlaneGeometry(0.22, 0.18), toon(color));
  m.material.side = 2;
  return m;
}

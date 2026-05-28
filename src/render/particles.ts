import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
} from 'three';

type Burst = {
  points: Points;
  velocities: Float32Array;
  ttl: number;
  age: number;
};

export type Particles = {
  burst(scene: Scene, pos: Vector3, color: number, count?: number): void;
  update(scene: Scene, dt: number): void;
};

const GRAVITY = 6;
const TTL = 0.9;

export function createParticles(): Particles {
  const active: Burst[] = [];

  return {
    burst: (scene, pos, color, count = 18) => {
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y + 0.8;
        positions[i * 3 + 2] = pos.z;
        const theta = Math.random() * Math.PI * 2;
        const speed = 1.6 + Math.random() * 2.4;
        velocities[i * 3] = Math.cos(theta) * speed * 0.6;
        velocities[i * 3 + 1] = 2 + Math.random() * 2.8;
        velocities[i * 3 + 2] = Math.sin(theta) * speed * 0.6;
      }
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
      const mat = new PointsMaterial({
        color: new Color(color),
        size: 0.22,
        transparent: true,
        depthWrite: false,
      });
      const points = new Points(geo, mat);
      scene.add(points);
      active.push({ points, velocities, ttl: TTL, age: 0 });
    },
    update: (scene, dt) => {
      for (let b = active.length - 1; b >= 0; b--) {
        const burst = active[b];
        if (!burst) continue;
        burst.age += dt;
        const attr = burst.points.geometry.getAttribute('position') as Float32BufferAttribute;
        const pos = attr.array as Float32Array;
        const count = burst.velocities.length / 3;
        for (let i = 0; i < count; i++) {
          const ix = i * 3;
          const iy = ix + 1;
          const iz = ix + 2;
          pos[ix] = (pos[ix] ?? 0) + (burst.velocities[ix] ?? 0) * dt;
          burst.velocities[iy] = (burst.velocities[iy] ?? 0) - GRAVITY * dt;
          pos[iy] = (pos[iy] ?? 0) + (burst.velocities[iy] ?? 0) * dt;
          pos[iz] = (pos[iz] ?? 0) + (burst.velocities[iz] ?? 0) * dt;
        }
        attr.needsUpdate = true;
        const fade = 1 - burst.age / burst.ttl;
        (burst.points.material as PointsMaterial).opacity = Math.max(0, fade);
        if (burst.age >= burst.ttl) {
          scene.remove(burst.points);
          burst.points.geometry.dispose();
          (burst.points.material as PointsMaterial).dispose();
          active.splice(b, 1);
        }
      }
    },
  };
}

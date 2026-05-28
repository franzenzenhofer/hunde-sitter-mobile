import { Group, Vector3 } from 'three';
import { buildDogMesh, type DogMesh } from './dog-mesh';
import { type DogStats, decayStats, newStats } from './dog-stats';

export type DogMode = 'idle' | 'wander' | 'chase-ball' | 'return-ball' | 'return-home';

export type Dog = {
  group: Group;
  mesh: DogMesh;
  stats: DogStats;
  mode: DogMode;
  speed: number;
  update(dt: number, player: Vector3, ballPos: Vector3 | null, carrying: boolean): void;
  animate(dt: number): void;
};

const WANDER_RADIUS = 4;
const RETURN_RADIUS = 9;
const CHASE_SPEED = 6.5;
const CARRY_SPEED = 5.0;
const WANDER_SPEED = 1.4;
const TURN = 9;

export function createDog(): Dog {
  const mesh = buildDogMesh();
  const wanderTarget = new Vector3();
  let walkPhase = 0;
  let tailPhase = 0;
  let wanderTimer = 0;

  const state: Dog = {
    group: mesh.group,
    mesh,
    stats: newStats(),
    mode: 'idle',
    speed: 0,
    update: (dt, player, ballPos, carrying) => {
      decayStats(state.stats, dt);
      const dir = new Vector3();
      let speed = 0;

      if (carrying) {
        state.mode = 'return-ball';
        dir.subVectors(player, mesh.group.position).setY(0);
        if (dir.lengthSq() > 0.04) {
          dir.normalize();
          speed = CARRY_SPEED;
        }
      } else if (ballPos) {
        state.mode = 'chase-ball';
        dir.subVectors(ballPos, mesh.group.position).setY(0);
        if (dir.lengthSq() > 0.0001) {
          dir.normalize();
          speed = CHASE_SPEED;
        }
      } else {
        const distToPlayer = mesh.group.position.distanceTo(player);
        if (distToPlayer > RETURN_RADIUS) {
          state.mode = 'return-home';
          dir.subVectors(player, mesh.group.position).setY(0).normalize();
          speed = CHASE_SPEED * 0.6;
        } else {
          wanderTimer -= dt;
          if (wanderTimer <= 0) {
            wanderTimer = 2 + Math.random() * 3;
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * WANDER_RADIUS;
            wanderTarget.set(player.x + Math.cos(a) * r, 0, player.z + Math.sin(a) * r);
          }
          dir.subVectors(wanderTarget, mesh.group.position).setY(0);
          if (dir.lengthSq() > 0.4) {
            dir.normalize();
            speed = WANDER_SPEED;
            state.mode = 'wander';
          } else {
            state.mode = 'idle';
          }
        }
      }

      if (speed > 0) {
        mesh.group.position.addScaledVector(dir, speed * dt);
        const yaw = Math.atan2(dir.x, dir.z);
        const k = 1 - Math.exp(-TURN * dt);
        mesh.group.rotation.y = lerpAngle(mesh.group.rotation.y, yaw, k);
      }
      state.speed = speed;
    },
    animate: (dt) => {
      walkPhase += dt * (4 + state.speed * 0.9);
      tailPhase += dt * (state.mode === 'idle' ? 5 : 10);
      const s = Math.sin(walkPhase) * Math.min(1, state.speed / 3);
      animateLegs(mesh, s);
      mesh.tail.rotation.y = Math.sin(tailPhase) * 0.8;
      mesh.head.rotation.x = Math.sin(walkPhase * 0.5) * 0.05;
    },
  };
  return state;
}

function animateLegs(mesh: DogMesh, s: number): void {
  const legs = mesh.legs;
  if (legs[0]) legs[0].rotation.x = s * 0.6;
  if (legs[1]) legs[1].rotation.x = -s * 0.6;
  if (legs[2]) legs[2].rotation.x = -s * 0.6;
  if (legs[3]) legs[3].rotation.x = s * 0.6;
}

function lerpAngle(a: number, b: number, t: number): number {
  const d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}

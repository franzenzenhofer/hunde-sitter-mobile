import { Group, Vector2, Vector3 } from 'three';
import { buildPlayerMesh } from './player-mesh';

export type Player = {
  group: Group;
  velocity: Vector3;
  speed: number;
  move(input: Vector2, cameraYaw: number, dt: number): void;
  animate(dt: number): void;
  /** Play a short raise-and-wave - the trainer signalling the dog. */
  gesture(): void;
};

const SPEED = 4.5;
const TURN = 10;
const SWING = 1.0;
const GESTURE_DUR = 0.55;

export function createPlayer(): Player {
  const mesh = buildPlayerMesh();
  const velocity = new Vector3();
  let walkPhase = 0;
  let gestureT = 0;

  const state: Player = {
    group: mesh.group,
    velocity,
    speed: 0,
    move: (input, cameraYaw, dt) => {
      const len = input.length();
      if (len < 0.05) {
        velocity.multiplyScalar(Math.exp(-12 * dt));
      } else {
        const cos = Math.cos(cameraYaw);
        const sin = Math.sin(cameraYaw);
        const wx = input.x * cos + input.y * sin;
        const wz = -input.x * sin + input.y * cos;
        const norm = Math.hypot(wx, wz) || 1;
        const target = new Vector3(
          (wx / norm) * SPEED * Math.min(1, len),
          0,
          (wz / norm) * SPEED * Math.min(1, len),
        );
        velocity.lerp(target, 1 - Math.exp(-12 * dt));
        const yaw = Math.atan2(velocity.x, velocity.z);
        const k = 1 - Math.exp(-TURN * dt);
        mesh.group.rotation.y = lerpAngle(mesh.group.rotation.y, yaw, k);
      }
      mesh.group.position.x += velocity.x * dt;
      mesh.group.position.z += velocity.z * dt;
      state.speed = Math.hypot(velocity.x, velocity.z);
    },
    animate: (dt) => {
      walkPhase += dt * (3 + state.speed * 1.6);
      const s = Math.sin(walkPhase) * SWING * Math.min(1, state.speed / 2);
      mesh.leftLeg.rotation.x = s * 0.7;
      mesh.rightLeg.rotation.x = -s * 0.7;
      mesh.leftArm.rotation.x = -s * 0.5;
      mesh.rightArm.rotation.x = s * 0.5;
      // A signalling gesture overrides the right arm: raise it and wave.
      if (gestureT > 0) {
        gestureT = Math.max(0, gestureT - dt);
        const p = 1 - gestureT / GESTURE_DUR; // 0 -> 1 over the gesture
        mesh.rightArm.rotation.x = -2.4;
        mesh.rightArm.rotation.z = Math.sin(p * Math.PI * 6) * 0.5;
      } else {
        mesh.rightArm.rotation.z = 0;
      }
    },
    gesture: () => {
      gestureT = GESTURE_DUR;
    },
  };
  return state;
}

function lerpAngle(a: number, b: number, t: number): number {
  const d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}

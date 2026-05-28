import { Vector3, type Object3D, type PerspectiveCamera } from 'three';

export type FollowCamera = {
  target: Object3D;
  yaw: number;
  pitch: number;
  distance: number;
  update(dt: number): void;
};

const MIN_PITCH = 0.2;
const MAX_PITCH = 1.2;
const SMOOTH = 6;

export function createFollowCamera(camera: PerspectiveCamera, target: Object3D): FollowCamera {
  const state: FollowCamera = {
    target,
    yaw: 0,
    pitch: 0.7,
    distance: 9,
    update: (dt) => {
      state.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, state.pitch));
      const cosP = Math.cos(state.pitch);
      const offset = new Vector3(
        Math.sin(state.yaw) * state.distance * cosP,
        Math.sin(state.pitch) * state.distance,
        Math.cos(state.yaw) * state.distance * cosP,
      );
      const desired = target.position.clone().add(offset);
      const k = 1 - Math.exp(-SMOOTH * dt);
      camera.position.lerp(desired, k);
      const lookAt = target.position.clone().add(new Vector3(0, 1.2, 0));
      camera.lookAt(lookAt);
    },
  };
  return state;
}

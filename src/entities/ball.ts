import { BoxGeometry, Mesh, type Object3D, type Scene, Vector3 } from 'three';
import { toon } from '../render/toon-material';

const BOUNCE = 0.55;
const FRICTION = 1.4;
const GRAVITY = 18;
const REACH_DIST_SQ = 0.7 * 0.7;

export type BallMode = 'idle' | 'flying' | 'carried' | 'dropped';

export type Ball = {
  mesh: Mesh;
  velocity: Vector3;
  mode: BallMode;
  get alive(): boolean;
  throw(from: Vector3, dir: Vector3, power: number): void;
  update(dt: number): void;
  caughtBy(pos: Vector3): boolean;
  carryWith(host: Object3D): void;
  dropAt(scene: Scene, pos: Vector3): void;
  reset(): void;
};

export function createBall(scene: Scene): Ball {
  const mesh = new Mesh(new BoxGeometry(0.34, 0.34, 0.34), toon(0xff6b6b));
  mesh.visible = false;
  scene.add(mesh);
  const velocity = new Vector3();
  let mode: BallMode = 'idle';

  return {
    mesh,
    velocity,
    get alive() {
      return mode === 'flying';
    },
    get mode() {
      return mode;
    },
    throw: (from, dir, power) => {
      scene.attach(mesh);
      mesh.position.copy(from).setY(Math.max(from.y, 1.2));
      const flat = dir.clone().setY(0);
      if (flat.lengthSq() < 0.0001) flat.set(0, 0, 1);
      flat.normalize();
      velocity.copy(flat).multiplyScalar(power);
      velocity.y = power * 0.5;
      mesh.visible = true;
      mode = 'flying';
    },
    update: (dt) => {
      mesh.rotation.x += dt * 4;
      mesh.rotation.y += dt * 3;
      if (mode !== 'flying') return;
      velocity.y -= GRAVITY * dt;
      mesh.position.addScaledVector(velocity, dt);
      if (mesh.position.y < 0.17) {
        mesh.position.y = 0.17;
        velocity.y = -velocity.y * BOUNCE;
        velocity.x *= 1 - FRICTION * dt;
        velocity.z *= 1 - FRICTION * dt;
        if (Math.abs(velocity.y) < 0.4 && velocity.lengthSq() < 0.5) {
          velocity.setScalar(0);
          mode = 'dropped';
        }
      }
    },
    caughtBy: (pos) => {
      if (mode !== 'flying' && mode !== 'dropped') return false;
      const wp = new Vector3();
      mesh.getWorldPosition(wp);
      if (mode === 'dropped') {
        // A grounded ball sits at y≈0.17 while the mouth rides ~1.25 up — a full
        // 3D reach could never close that gap. The dog dips its head, so only the
        // horizontal distance matters here.
        const dx = wp.x - pos.x;
        const dz = wp.z - pos.z;
        return dx * dx + dz * dz < REACH_DIST_SQ;
      }
      return wp.distanceToSquared(pos) < REACH_DIST_SQ;
    },
    carryWith: (host) => {
      host.attach(mesh);
      mesh.position.set(0, 0, 0);
      mode = 'carried';
      velocity.setScalar(0);
    },
    dropAt: (s, pos) => {
      s.attach(mesh);
      mesh.position.set(pos.x, 0.17, pos.z);
      velocity.setScalar(0);
      mode = 'dropped';
    },
    reset: () => {
      scene.attach(mesh);
      mesh.visible = false;
      mode = 'idle';
      velocity.setScalar(0);
    },
  };
}

/**
 * Right-side touch camera control.
 *
 *  - One finger: drag to look around (yaw + pitch).
 *  - Two fingers: pinch to zoom the scene (distance) and twist to orbit (yaw).
 *
 * All gestures are accumulated and drained once per frame by the game loop, so
 * the camera math lives in one place. The left half of the screen belongs to
 * the movement joystick, so only pointers on the right half are tracked here.
 */
export type CameraGesture = { dx: number; dy: number; zoom: number; twist: number };

export type CameraDrag = {
  consume(): CameraGesture;
  destroy(): void;
};

const LOOK_SENS = 0.005;
const ZOOM_SENS = 0.03;

const wrapAngle = (a: number): number => {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
};

export function createCameraDrag(): CameraDrag {
  const pointers = new Map<number, { x: number; y: number }>();
  let acc: CameraGesture = { dx: 0, dy: 0, zoom: 0, twist: 0 };
  let lastPinch: number | null = null;
  let lastAngle: number | null = null;

  const resetPinch = (): void => {
    lastPinch = null;
    lastAngle = null;
  };

  // Seed the pinch baseline from the current two fingers so the very next move
  // measures a real delta (not just sets the baseline).
  const baselinePinch = (): void => {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return;
    lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
    lastAngle = Math.atan2(b.y - a.y, b.x - a.x);
  };

  const onDown = (e: PointerEvent): void => {
    if (e.clientX < window.innerWidth / 2) return; // left half is the joystick
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) baselinePinch(); // pinch begins now
  };

  const onMove = (e: PointerEvent): void => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);

    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      if (lastPinch !== null) acc.zoom += (dist - lastPinch) * ZOOM_SENS;
      if (lastAngle !== null) acc.twist += wrapAngle(angle - lastAngle);
      lastPinch = dist;
      lastAngle = angle;
    } else {
      acc.dx += (cur.x - prev.x) * LOOK_SENS;
      acc.dy += (cur.y - prev.y) * LOOK_SENS;
    }
  };

  const onUp = (e: PointerEvent): void => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size < 2) resetPinch();
  };

  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return {
    consume: () => {
      const out = acc;
      acc = { dx: 0, dy: 0, zoom: 0, twist: 0 };
      return out;
    },
    destroy: () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    },
  };
}

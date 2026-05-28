export type CameraDrag = {
  consume(): { dx: number; dy: number };
  destroy(): void;
};

const SENS = 0.005;

export function createCameraDrag(): CameraDrag {
  let pointerId: number | null = null;
  let last = { x: 0, y: 0 };
  let acc = { dx: 0, dy: 0 };

  const onDown = (e: PointerEvent): void => {
    if (pointerId !== null) return;
    if (e.clientX < window.innerWidth / 2) return;
    pointerId = e.pointerId;
    last = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    acc.dx += (e.clientX - last.x) * SENS;
    acc.dy += (e.clientY - last.y) * SENS;
    last = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
  };

  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return {
    consume: () => {
      const out = acc;
      acc = { dx: 0, dy: 0 };
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

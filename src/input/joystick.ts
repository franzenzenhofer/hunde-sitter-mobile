import { Vector2 } from 'three';

export type Joystick = {
  value: Vector2;
  destroy(): void;
};

const RADIUS = 56;

export function createJoystick(host: HTMLElement): Joystick {
  const base = document.createElement('div');
  base.id = 'joy-base';
  const knob = document.createElement('div');
  knob.id = 'joy-knob';
  base.appendChild(knob);
  host.appendChild(base);

  const value = new Vector2();
  let pointerId: number | null = null;
  let origin = { x: 0, y: 0 };

  const show = (x: number, y: number): void => {
    origin = { x, y };
    base.style.left = `${x - RADIUS}px`;
    base.style.top = `${y - RADIUS}px`;
    base.style.opacity = '1';
    knob.style.transform = 'translate(0,0)';
  };

  const hide = (): void => {
    base.style.opacity = '0';
    value.set(0, 0);
    pointerId = null;
  };

  const onDown = (e: PointerEvent): void => {
    if (pointerId !== null) return;
    if (e.clientX > window.innerWidth / 2) return;
    pointerId = e.pointerId;
    show(e.clientX, e.clientY);
  };
  const onMove = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const len = Math.hypot(dx, dy);
    const k = len > RADIUS ? RADIUS / len : 1;
    const kx = dx * k;
    const ky = dy * k;
    knob.style.transform = `translate(${kx}px,${ky}px)`;
    value.set(kx / RADIUS, ky / RADIUS);
  };
  const onUp = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    hide();
  };

  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return {
    value,
    destroy: () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      base.remove();
    },
  };
}

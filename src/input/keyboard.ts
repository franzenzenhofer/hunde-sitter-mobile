import { Vector2 } from 'three';

export type Keyboard = {
  value: Vector2;
  onAction(cb: () => void): () => void;
  destroy(): void;
};

const KEY_DIRS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createKeyboard(): Keyboard {
  const value = new Vector2();
  const held = new Set<string>();
  const actionHandlers = new Set<() => void>();

  const recalc = (): void => {
    let x = 0;
    let y = 0;
    for (const code of held) {
      const dir = KEY_DIRS[code];
      if (dir) {
        x += dir[0];
        y += dir[1];
      }
    }
    value.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
  };

  const onDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      for (const h of actionHandlers) h();
      return;
    }
    held.add(e.code);
    recalc();
  };
  const onUp = (e: KeyboardEvent): void => {
    held.delete(e.code);
    recalc();
  };

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  return {
    value,
    onAction: (cb) => {
      actionHandlers.add(cb);
      return () => actionHandlers.delete(cb);
    },
    destroy: () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    },
  };
}

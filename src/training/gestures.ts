import { emit, on } from '../core/bus';

const CLAP_WINDOW_MS = 350;
const LONG_PRESS_MS = 700;

export type GestureBus = {
  destroy(): void;
};

export function attachGestureDetectors(): GestureBus {
  let lastTap = 0;
  let pressTimer = 0;
  let longFired = false;

  const onActionDown = (): void => {
    longFired = false;
    clearTimeout(pressTimer);
    pressTimer = window.setTimeout(() => {
      longFired = true;
      emit('gesture:whistle', {});
    }, LONG_PRESS_MS);
  };

  const onActionUp = (): void => {
    clearTimeout(pressTimer);
    if (longFired) return;
    const now = performance.now();
    if (now - lastTap < CLAP_WINDOW_MS) {
      emit('gesture:clap', {});
      lastTap = 0;
    } else {
      lastTap = now;
      emit('gesture:tap', {});
    }
  };

  const unsubs = [
    on('input:action-down', onActionDown),
    on('input:action-up', onActionUp),
  ];

  return {
    destroy: () => {
      unsubs.forEach((u) => u());
      clearTimeout(pressTimer);
    },
  };
}

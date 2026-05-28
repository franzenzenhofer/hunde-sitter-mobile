import { createClock } from './clock';

export type UpdateFn = (dt: number) => void;

export type Loop = {
  start(): void;
  stop(): void;
  add(fn: UpdateFn): () => void;
};

export function createLoop(): Loop {
  const clock = createClock();
  const updaters = new Set<UpdateFn>();
  let raf = 0;
  let running = false;

  const frame = (): void => {
    if (!running) return;
    const dt = clock.tick();
    for (const fn of updaters) fn(dt);
    raf = requestAnimationFrame(frame);
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      clock.tick();
      raf = requestAnimationFrame(frame);
    },
    stop: () => {
      running = false;
      cancelAnimationFrame(raf);
    },
    add: (fn) => {
      updaters.add(fn);
      return () => updaters.delete(fn);
    },
  };
}

const MAX_DT_MS = 100;

export type Clock = {
  now(): number;
  tick(): number;
};

export function createClock(): Clock {
  let last = performance.now();
  return {
    now: () => performance.now(),
    tick: () => {
      const t = performance.now();
      const dt = Math.min(MAX_DT_MS, t - last) / 1000;
      last = t;
      return dt;
    },
  };
}

export function sleep(ms: number, abort: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (abort.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    const id = setTimeout(() => {
      abort.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(id);
      reject(new DOMException('aborted', 'AbortError'));
    };
    abort.addEventListener('abort', onAbort, { once: true });
  });
}

export async function tween(
  set: (k: number) => void,
  from: number,
  to: number,
  durationMs: number,
  abort: AbortSignal,
): Promise<void> {
  const start = performance.now();
  while (true) {
    if (abort.aborted) throw new DOMException('aborted', 'AbortError');
    const t = Math.min(1, (performance.now() - start) / durationMs);
    const eased = t * t * (3 - 2 * t);
    set(from + (to - from) * eased);
    if (t >= 1) return;
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
}

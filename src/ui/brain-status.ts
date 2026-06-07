/**
 * A tiny, non-intrusive readout of Bello's brain: downloading the model,
 * awake, thinking, or unavailable. Lives top-left, never blocks input.
 */
export type BrainStatus = {
  el: HTMLDivElement;
  setProgress(pct: number): void;
  setReady(): void;
  setError(): void;
};

export function createBrainStatus(host: HTMLElement): BrainStatus {
  const el = document.createElement('div');
  el.id = 'brain-status';
  el.style.cssText = [
    'position:absolute',
    'top:calc(10px + env(safe-area-inset-top))',
    'left:calc(10px + env(safe-area-inset-left))',
    'padding:5px 10px',
    'background:rgba(255,255,255,0.55)',
    'border-radius:10px',
    'font:700 11px -apple-system,sans-serif',
    'color:#2a2a2a',
    'pointer-events:none',
    'transition:opacity 400ms ease',
  ].join(';');

  let ready = false;
  const render = (text: string): void => {
    el.textContent = text;
  };
  render('🧠 Bello is waking up…');
  host.appendChild(el);

  return {
    el,
    setProgress: (pct) => {
      if (!ready) render(`🧠 Bello is waking up… ${Math.max(0, Math.min(100, pct))}%`);
    },
    setReady: () => {
      ready = true;
      render('🧠 Bello is awake');
      setTimeout(() => {
        el.style.opacity = '0';
      }, 2200);
    },
    setError: () => {
      ready = false;
      render('🐶 Bello runs on instinct (brain unavailable)');
      setTimeout(() => {
        el.style.opacity = '0';
      }, 4000);
    },
  };
}

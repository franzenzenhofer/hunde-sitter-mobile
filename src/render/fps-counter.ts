export type FpsCounter = {
  el: HTMLDivElement;
  update(dt: number): void;
};

const SAMPLE_WINDOW = 30;

export function createFpsCounter(host: HTMLElement): FpsCounter {
  const el = document.createElement('div');
  el.id = 'fps';
  el.style.cssText = [
    'position:absolute',
    'top:env(safe-area-inset-top,12px)',
    'right:12px',
    'padding:4px 8px',
    'background:rgba(255,255,255,0.7)',
    'border-radius:8px',
    'font:600 11px ui-monospace,monospace',
    'color:#222',
    'pointer-events:none',
  ].join(';');
  host.appendChild(el);

  const samples: number[] = [];
  return {
    el,
    update: (dt) => {
      samples.push(dt);
      if (samples.length > SAMPLE_WINDOW) samples.shift();
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      el.textContent = `${(1 / avg).toFixed(0)} fps`;
    },
  };
}

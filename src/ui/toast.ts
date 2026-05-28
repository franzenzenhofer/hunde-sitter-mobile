export type Toast = {
  show(text: string): void;
  destroy(): void;
};

const DURATION_MS = 2200;

export function createToast(host: HTMLElement): Toast {
  const el = document.createElement('div');
  el.id = 'toast';
  el.style.cssText = [
    'position:absolute',
    'top:calc(150px + env(safe-area-inset-top))',
    'left:calc(16px + env(safe-area-inset-left))',
    'padding:6px 12px',
    'background:rgba(255,255,255,0.9)',
    'color:#5a4a2a',
    'border-radius:999px',
    'font:700 12px -apple-system,sans-serif',
    'letter-spacing:0.06em',
    'text-transform:uppercase',
    'opacity:0',
    'transform:translateY(-6px)',
    'transition:opacity 220ms ease,transform 220ms ease',
    'pointer-events:none',
    'box-shadow:0 3px 10px rgba(0,0,0,0.12)',
  ].join(';');
  host.appendChild(el);

  let timer = 0;

  return {
    show: (text) => {
      el.textContent = `${text}`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      clearTimeout(timer);
      timer = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-6px)';
      }, DURATION_MS);
    },
    destroy: () => {
      clearTimeout(timer);
      el.remove();
    },
  };
}

import type { AudioBus } from './context';

export type MuteButton = {
  el: HTMLButtonElement;
  destroy(): void;
};

const STORAGE_KEY = 'hs:muted';

export function createMuteButton(host: HTMLElement, bus: AudioBus): MuteButton {
  const el = document.createElement('button');
  el.id = 'mute';
  el.type = 'button';
  el.style.cssText = [
    'position:absolute',
    'top:calc(12px + env(safe-area-inset-top))',
    'right:calc(86px + env(safe-area-inset-right))',
    'width:40px',
    'height:40px',
    'border-radius:50%',
    'border:2px solid #fff',
    'background:rgba(255,255,255,0.78)',
    'font-size:18px',
    'cursor:pointer',
    'touch-action:manipulation',
    'box-shadow:0 3px 8px rgba(0,0,0,0.15)',
  ].join(';');
  host.appendChild(el);

  const initial = localStorage.getItem(STORAGE_KEY) === '1';
  bus.setMuted(initial);
  el.textContent = initial ? 'OFF' : 'ON';
  el.style.fontWeight = '700';
  el.style.fontSize = '10px';
  el.style.letterSpacing = '0.06em';

  const toggle = (): void => {
    const next = !bus.isMuted();
    bus.setMuted(next);
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    el.textContent = next ? 'OFF' : 'ON';
  };
  el.addEventListener('click', toggle);

  return {
    el,
    destroy: () => {
      el.removeEventListener('click', toggle);
      el.remove();
    },
  };
}

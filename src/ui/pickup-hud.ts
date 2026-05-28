import type { PickupBag } from '../entities/pickups';

export type PickupHud = {
  el: HTMLDivElement;
  update(bag: PickupBag): void;
};

export function createPickupHud(host: HTMLElement): PickupHud {
  const el = document.createElement('div');
  el.id = 'inv';
  el.style.cssText = [
    'position:absolute',
    'bottom:calc(40px + env(safe-area-inset-bottom))',
    'left:calc(20px + env(safe-area-inset-left))',
    'display:flex',
    'gap:8px',
    'pointer-events:none',
  ].join(';');

  const ball = chip('#ff6b6b');
  const treat = chip('#f5e6c8');
  el.appendChild(ball.wrap);
  el.appendChild(treat.wrap);
  host.appendChild(el);

  return {
    el,
    update: (bag) => {
      ball.count.textContent = `${bag.count('ball')}`;
      treat.count.textContent = `${bag.count('treat')}`;
    },
  };
}

function chip(swatchColor: string): { wrap: HTMLDivElement; count: HTMLSpanElement } {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:6px',
    'padding:5px 10px',
    'background:rgba(255,255,255,0.55)',
    'border-radius:10px',
    'font:700 12px -apple-system,sans-serif',
    'color:#2a2a2a',
  ].join(';');
  const swatch = document.createElement('span');
  swatch.style.cssText = [
    'display:inline-block',
    'width:12px',
    'height:12px',
    `background:${swatchColor}`,
    'border:1px solid rgba(0,0,0,0.25)',
    'box-shadow:inset -2px -2px 0 rgba(0,0,0,0.15)',
  ].join(';');
  const count = document.createElement('span');
  count.textContent = '0';
  wrap.appendChild(swatch);
  wrap.appendChild(count);
  return { wrap, count };
}

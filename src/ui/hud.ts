import type { DogStats } from '../entities/dog-stats';

export type Hud = {
  el: HTMLDivElement;
  update(stats: DogStats): void;
};

const ROWS: Array<{ key: keyof DogStats; label: string; color: string }> = [
  { key: 'hunger', label: 'Hunger', color: '#ff9a5a' },
  { key: 'fun', label: 'Fun', color: '#5dcafe' },
  { key: 'love', label: 'Love', color: '#ff6b9d' },
];

export function createHud(host: HTMLElement): Hud {
  const el = document.createElement('div');
  el.id = 'hud';
  el.style.cssText = [
    'position:absolute',
    'top:calc(12px + env(safe-area-inset-top))',
    'left:calc(12px + env(safe-area-inset-left))',
    'min-width:170px',
    'padding:10px 12px',
    'background:rgba(255,255,255,0.55)',
    'border-radius:14px',
    'font:600 12px -apple-system,sans-serif',
    'color:#2a2a2a',
    'backdrop-filter:blur(8px)',
    'box-shadow:0 4px 12px rgba(0,0,0,0.1)',
    'pointer-events:none',
  ].join(';');

  const bars: Partial<Record<keyof DogStats, HTMLDivElement>> = {};
  for (const row of ROWS) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin:3px 0';
    const label = document.createElement('span');
    label.textContent = row.label;
    label.style.cssText = 'width:46px';
    const track = document.createElement('div');
    track.style.cssText =
      'flex:1;height:8px;background:#e8e2d8;border-radius:5px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.12)';
    const fill = document.createElement('div');
    fill.style.height = '100%';
    fill.style.width = '80%';
    fill.style.background = row.color;
    fill.style.borderRadius = '5px';
    fill.style.transition = 'width 200ms ease';
    track.appendChild(fill);
    wrap.appendChild(label);
    wrap.appendChild(track);
    el.appendChild(wrap);
    bars[row.key] = fill;
  }

  host.appendChild(el);
  return {
    el,
    update: (stats) => {
      for (const row of ROWS) {
        const bar = bars[row.key];
        if (bar) bar.style.width = `${stats[row.key]}%`;
      }
    },
  };
}

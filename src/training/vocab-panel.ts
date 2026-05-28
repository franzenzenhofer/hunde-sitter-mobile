import type { TrainingEngine } from './engine';

export type VocabPanel = {
  el: HTMLDivElement;
  refresh(): void;
};

export function createVocabPanel(host: HTMLElement, engine: TrainingEngine): VocabPanel {
  const el = document.createElement('div');
  el.id = 'vocab';
  el.style.cssText = [
    'position:absolute',
    'top:calc(170px + env(safe-area-inset-top))',
    'right:calc(12px + env(safe-area-inset-right))',
    'min-width:120px',
    'padding:6px 10px',
    'background:rgba(255,255,255,0.55)',
    'border-radius:10px',
    'font:600 11px -apple-system,sans-serif',
    'color:#2a2a2a',
    'pointer-events:none',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'BELLO KNOWS';
  title.style.cssText = 'font-weight:800;letter-spacing:0.07em;font-size:9px;color:#555;margin-bottom:3px';
  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex-direction:column;gap:2px';
  el.appendChild(title);
  el.appendChild(body);
  host.appendChild(el);

  const refresh = (): void => {
    const entries: Array<{ g: string; t: string; s: number }> = [];
    for (const [g, row] of Object.entries(engine.state.vocabulary)) {
      for (const [t, a] of Object.entries(row)) {
        if (a.strength > 0.05) entries.push({ g, t, s: a.strength });
      }
    }
    entries.sort((a, b) => b.s - a.s);
    body.replaceChildren();
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = '(nothing yet)';
      empty.style.color = '#888';
      body.appendChild(empty);
      return;
    }
    for (const e of entries.slice(0, 4)) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:8px';
      const left = document.createElement('span');
      left.textContent = `${e.g} -> ${e.t}`;
      const right = document.createElement('span');
      right.textContent = bar(e.s);
      right.style.fontFamily = 'ui-monospace,monospace';
      row.append(left, right);
      body.appendChild(row);
    }
  };

  return { el, refresh };
}

function bar(strength: number): string {
  const filled = Math.round(strength * 5);
  return '#'.repeat(filled).padEnd(5, '.');
}

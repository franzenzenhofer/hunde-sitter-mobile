/**
 * "Bello remembers" - a live window into the dog's actual brain memory: the
 * recent cue -> action -> reward episodes the LLM is using as context. This is
 * the player's view of Bello growing aware: rewarded episodes are marked, so
 * you can see the pattern you're shaping.
 */
import type { Episode } from '../ai/bello-brain';

const CUE_GLYPH: Record<string, string> = {
  clap: '👏',
  whistle: '😙',
  point: '👉',
  snap: '🫰',
};

export type MemoryPanel = {
  el: HTMLDivElement;
  update(history: readonly Episode[], tricks: Record<string, { name: string }>): void;
};

export function createMemoryPanel(): MemoryPanel {
  const el = document.createElement('div');
  el.id = 'memory';
  el.style.cssText = [
    'position:absolute',
    'top:calc(10px + env(safe-area-inset-top))',
    'right:calc(12px + env(safe-area-inset-right))',
    'min-width:140px',
    'max-width:230px',
    'padding:6px 10px',
    'background:rgba(255,255,255,0.5)',
    'border-radius:10px',
    'font:600 11px -apple-system,sans-serif',
    'color:#2a2a2a',
    'pointer-events:none',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'BELLO REMEMBERS';
  title.style.cssText =
    'font-weight:800;letter-spacing:0.07em;font-size:9px;color:#555;margin-bottom:3px';

  const empty = document.createElement('div');
  empty.className = 'memory-empty';
  empty.textContent = 'Cue Bello, then 👍 what you like.';
  empty.style.color = '#888';

  const list = document.createElement('div');
  list.className = 'memory-list';
  list.style.cssText = 'display:flex;flex-direction:column;gap:2px';
  list.hidden = true;

  el.append(title, empty, list);

  const update: MemoryPanel['update'] = (history, tricks) => {
    const recent = history.slice(-5).reverse();
    empty.hidden = recent.length > 0;
    list.hidden = recent.length === 0;
    list.replaceChildren();
    for (const e of recent) {
      const row = document.createElement('div');
      row.className = 'memory-row';
      row.style.whiteSpace = 'nowrap';
      const cue = e.cue ? (CUE_GLYPH[e.cue] ?? e.cue) : '🐶';
      const name = tricks[e.action]?.name ?? e.action;
      const mark = e.reward > 0 ? '👍' : '·';
      row.textContent = `${cue} → ${name} ${mark}`;
      list.appendChild(row);
    }
  };

  return { el, update };
}

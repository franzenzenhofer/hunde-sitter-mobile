import type { Association } from './learning';

/** Cue id → the glyph shown in the panel (mirrors the dock command icons). */
const GESTURE_ICON: Record<string, string> = {
  clap: '👏',
  whistle: '😙',
  point: '👉',
  snap: '🫰',
};
const LEARNED_THRESHOLD = 0.05;

export type VocabAssoc = { gesture: string; trick: string; strength: number };

/**
 * Flatten the vocabulary into the learned cue→trick pairs worth showing:
 * above the learned threshold, backed by a trick that still exists, strongest
 * first. Pure (data in, data out) so it's trivially testable.
 */
export function topAssociations(
  vocab: Record<string, Record<string, Association>>,
  tricks: Record<string, { name: string }>,
  limit = 4,
): VocabAssoc[] {
  const out: VocabAssoc[] = [];
  for (const [gesture, row] of Object.entries(vocab)) {
    for (const [trickId, assoc] of Object.entries(row)) {
      if (assoc.strength <= LEARNED_THRESHOLD) continue;
      const trick = tricks[trickId];
      if (!trick) continue;
      out.push({ gesture, trick: trick.name, strength: assoc.strength });
    }
  }
  out.sort((a, b) => b.strength - a.strength);
  return out.slice(0, limit);
}

export type VocabPanel = {
  el: HTMLDivElement;
  /** Re-render from the current vocabulary + trick names. Idempotent. */
  update(
    vocab: Record<string, Record<string, Association>>,
    tricks: Record<string, { name: string }>,
  ): void;
};

export function createVocabPanel(): VocabPanel {
  const el = document.createElement('div');
  el.id = 'vocab';
  el.style.cssText = [
    'position:absolute',
    'top:calc(10px + env(safe-area-inset-top))',
    'left:50%',
    'transform:translateX(-50%)',
    'min-width:120px',
    'max-width:240px',
    'padding:5px 10px',
    'background:rgba(255,255,255,0.5)',
    'border-radius:10px',
    'font:600 11px -apple-system,sans-serif',
    'color:#2a2a2a',
    'pointer-events:none',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'BELLO KNOWS';
  title.style.cssText =
    'font-weight:800;letter-spacing:0.07em;font-size:9px;color:#555;margin-bottom:3px';

  const empty = document.createElement('div');
  empty.className = 'vocab-empty';
  empty.textContent = 'Cue → trick → 👍 to teach me!';
  empty.style.color = '#888';

  const list = document.createElement('div');
  list.className = 'vocab-list';
  list.style.cssText = 'display:flex;flex-direction:column;gap:3px';
  list.hidden = true;

  el.append(title, empty, list);

  const update: VocabPanel['update'] = (vocab, tricks) => {
    const items = topAssociations(vocab, tricks);
    const has = items.length > 0;
    empty.hidden = has;
    list.hidden = !has;
    list.replaceChildren();
    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'vocab-row';
      row.style.cssText = 'display:flex;align-items:center;gap:6px';

      const cue = document.createElement('span');
      cue.className = 'vocab-cue';
      cue.textContent = `${GESTURE_ICON[it.gesture] ?? it.gesture} → ${it.trick}`;
      cue.style.whiteSpace = 'nowrap';

      const track = document.createElement('span');
      track.className = 'vocab-bar';
      track.style.cssText =
        'flex:1;height:5px;background:rgba(0,0,0,0.12);border-radius:3px;overflow:hidden';
      const fill = document.createElement('span');
      fill.className = 'vocab-fill';
      fill.style.cssText = 'display:block;height:100%;background:#ff9a5a';
      fill.style.width = `${Math.round(it.strength * 100)}%`;
      track.appendChild(fill);

      row.append(cue, track);
      list.appendChild(row);
    }
  };

  return { el, update };
}

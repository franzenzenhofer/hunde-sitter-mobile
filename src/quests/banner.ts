import type { QuestState } from './types';

export type QuestBanner = {
  el: HTMLDivElement;
  update(q: QuestState): void;
};

export function createQuestBanner(host: HTMLElement): QuestBanner {
  const el = document.createElement('div');
  el.id = 'quest';
  el.style.cssText = [
    'position:absolute',
    'top:calc(14px + env(safe-area-inset-top))',
    'left:50%',
    'transform:translateX(-50%)',
    'min-width:160px',
    'max-width:60vw',
    'padding:4px 10px',
    'background:rgba(255,255,255,0.32)',
    'border-radius:8px',
    'font:600 11px -apple-system,sans-serif',
    'color:#2a2a2a',
    'text-align:center',
    'pointer-events:none',
    'opacity:0.85',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = '';
  const progress = document.createElement('div');
  progress.style.cssText = 'margin-top:2px;font-weight:500;font-size:10px;color:#555';
  el.appendChild(title);
  el.appendChild(progress);
  host.appendChild(el);

  return {
    el,
    update: (q) => {
      title.textContent = q.label;
      progress.textContent = `${q.progress} / ${q.goal}`;
    },
  };
}

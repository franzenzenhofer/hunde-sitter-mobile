// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createVocabPanel, topAssociations } from '../../src/training/vocab-panel';
import type { Association } from '../../src/training/learning';

const a = (strength: number): Association => ({ strength, reinforcements: 1, lastReinforcedAt: 0 });
const tricks = { sit: { name: 'Sit' }, spin: { name: 'Spin' }, beg: { name: 'Beg' } };

describe('topAssociations', () => {
  it('keeps only learned pairs, strongest first', () => {
    const vocab = {
      clap: { sit: a(0.6), spin: a(0.02) }, // spin below threshold → dropped
      whistle: { beg: a(0.3) },
    };
    expect(topAssociations(vocab, tricks)).toEqual([
      { gesture: 'clap', trick: 'Sit', strength: 0.6 },
      { gesture: 'whistle', trick: 'Beg', strength: 0.3 },
    ]);
  });

  it('skips associations whose trick no longer exists', () => {
    const vocab = { clap: { gone: a(0.9) } };
    expect(topAssociations(vocab, tricks)).toEqual([]);
  });
});

describe('createVocabPanel', () => {
  it('shows a training hint until something is learned', () => {
    const p = createVocabPanel();
    p.update({}, tricks);
    expect(p.el.querySelector<HTMLElement>('.vocab-empty')!.hidden).toBe(false);
    expect(p.el.querySelector<HTMLElement>('.vocab-list')!.hidden).toBe(true);
  });

  it('renders a row with a strength bar once a cue is learned', () => {
    const p = createVocabPanel();
    p.update({ clap: { sit: a(0.62) } }, tricks);
    expect(p.el.querySelector<HTMLElement>('.vocab-empty')!.hidden).toBe(true);
    const row = p.el.querySelector('.vocab-row')!;
    expect(row.querySelector('.vocab-cue')!.textContent).toBe('👏 → Sit');
    expect(row.querySelector<HTMLElement>('.vocab-fill')!.style.width).toBe('62%');
  });

  it('refreshes in place on repeated updates', () => {
    const p = createVocabPanel();
    p.update({ clap: { sit: a(0.2) } }, tricks);
    p.update({ clap: { sit: a(0.8) } }, tricks);
    expect(p.el.querySelectorAll('.vocab-row').length).toBe(1);
    expect(p.el.querySelector<HTMLElement>('.vocab-fill')!.style.width).toBe('80%');
  });
});

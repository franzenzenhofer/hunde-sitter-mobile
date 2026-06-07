// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createMemoryPanel } from '../../src/ui/memory-panel';
import type { Episode } from '../../src/ai/bello-brain';

const tricks = { sit: { name: 'Sit' }, spin: { name: 'Spin' } };
const ep = (cue: string | null, action: string, reward: number): Episode => ({
  cue,
  situation: '',
  action,
  reward,
});

describe('createMemoryPanel', () => {
  it('shows a hint until Bello has memories', () => {
    const p = createMemoryPanel();
    p.update([], tricks);
    expect(p.el.querySelector<HTMLElement>('.memory-empty')!.hidden).toBe(false);
    expect(p.el.querySelector<HTMLElement>('.memory-list')!.hidden).toBe(true);
  });

  it('renders recent episodes newest-first with cue glyph, trick name and reward mark', () => {
    const p = createMemoryPanel();
    p.update([ep('clap', 'sit', 1), ep(null, 'spin', 0)], tricks);
    const rows = [...p.el.querySelectorAll('.memory-row')].map((r) => r.textContent);
    expect(rows[0]).toBe('🐶 → Spin ·'); // spontaneous, ignored, newest first
    expect(rows[1]).toBe('👏 → Sit 👍'); // clap, rewarded
  });

  it('keeps only the last five episodes', () => {
    const p = createMemoryPanel();
    p.update(
      Array.from({ length: 8 }, (_, i) => ep('clap', i % 2 ? 'sit' : 'spin', 1)),
      tricks,
    );
    expect(p.el.querySelectorAll('.memory-row').length).toBe(5);
  });
});

import { describe, it, expect } from 'vitest';
import { rollQuest } from '../../src/quests/templates';
import { mulberry32 } from '../../src/world/rng';

describe('quests templates', () => {
  it('rolls a quest with positive goal and zero progress', () => {
    const rng = mulberry32(1);
    const q = rollQuest(rng);
    expect(q.goal).toBeGreaterThan(0);
    expect(q.progress).toBe(0);
    expect(q.id).toBeTruthy();
    expect(q.label.length).toBeGreaterThan(4);
  });

  it('avoidKind keeps a different kind when many candidates', () => {
    const rng = mulberry32(7);
    const q = rollQuest(rng, 'walk');
    expect(q.kind).not.toBe('walk');
  });

  it('visit quest carries a biome', () => {
    let visit = null;
    const rng = mulberry32(123);
    for (let i = 0; i < 80 && !visit; i++) {
      const q = rollQuest(rng);
      if (q.kind === 'visit') visit = q;
    }
    expect(visit).not.toBeNull();
    expect(visit?.biome).toBeTruthy();
  });
});

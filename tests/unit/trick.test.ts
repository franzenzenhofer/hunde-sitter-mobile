import { describe, it, expect } from 'vitest';
import { newTrick } from '../../src/training/trick';

describe('newTrick', () => {
  it('fills standard zeroed stats and defaults to system-authored', () => {
    const before = Date.now();
    const t = newTrick({ id: 'sit', name: 'Sit', program: { nodeId: 'sit' } });
    expect(t).toMatchObject({
      id: 'sit',
      name: 'Sit',
      program: { nodeId: 'sit' },
      mastery: 0,
      attempts: 0,
      successes: 0,
      reinforcements: 0,
      authoredBy: 'system',
    });
    expect(t.createdAt).toBeGreaterThanOrEqual(before);
    expect(t.cueGestureId).toBeUndefined();
  });

  it('honours cue, author and explicit createdAt', () => {
    const t = newTrick({
      id: 'x',
      name: 'X',
      program: { nodeId: 'bark' },
      cueGestureId: 'whistle',
      authoredBy: 'player',
      createdAt: 123,
    });
    expect(t.cueGestureId).toBe('whistle');
    expect(t.authoredBy).toBe('player');
    expect(t.createdAt).toBe(123);
  });

  it('omits cueGestureId entirely when not provided', () => {
    expect('cueGestureId' in newTrick({ id: 'a', name: 'A', program: { nodeId: 'sit' } })).toBe(false);
  });
});

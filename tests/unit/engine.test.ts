import { describe, it, expect, beforeAll } from 'vitest';
import { createTrainingEngine } from '../../src/training/engine';
import { registerPrimitive, getPrimitive } from '../../src/training/registry';
import { newTrick } from '../../src/training/trick';
import type { WorldContext } from '../../src/training/types';

// A trivial, synchronous behaviour so engine tests exercise the *conditioning*
// logic (which trick the dog picks) without any 3D animation/timers.
beforeAll(() => {
  if (!getPrimitive('noop'))
    registerPrimitive({
      id: 'noop',
      name: 'noop',
      description: '',
      category: 'action',
      childCount: 'none',
      execute: async () => ({ success: true }),
    });
});

const ctx = {} as WorldContext;
const trick = (id: string) => newTrick({ id, name: id, program: { nodeId: 'noop' } });

/** rng that yields a fixed sequence, then holds the last value. */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
}

function engineWith(rng: () => number, ids: string[]) {
  const e = createTrainingEngine(rng);
  for (const id of ids) e.registerTrick(trick(id));
  return e;
}

describe('TrainingEngine — operant conditioning', () => {
  it('an untrained cue still makes the dog react — with a random behaviour', async () => {
    const e = engineWith(seq(0), ['sit', 'spin', 'bark']);
    const r = await e.presentCue('clap', ctx); // no vocabulary yet → explore
    expect(r.success).toBe(true);
    expect(e.state.behaviors.at(-1)?.trickId).toBe('sit'); // floor(0 * 3) = 0
  });

  it('exploration spreads across the whole repertoire', async () => {
    const ids = ['sit', 'spin', 'bark'];
    const a = engineWith(seq(0.0), ids);
    const b = engineWith(seq(0.5), ids);
    const c = engineWith(seq(0.99), ids);
    await a.presentCue('clap', ctx);
    await b.presentCue('clap', ctx);
    await c.presentCue('clap', ctx);
    expect(a.state.behaviors.at(-1)?.trickId).toBe('sit'); // index 0
    expect(b.state.behaviors.at(-1)?.trickId).toBe('spin'); // index 1
    expect(c.state.behaviors.at(-1)?.trickId).toBe('bark'); // index 2
  });

  it('reward shapes the cue→behaviour association from zero', async () => {
    const e = engineWith(seq(0), ['sit', 'spin']);
    await e.presentCue('clap', ctx); // explores 'sit', logs gesture + behaviour
    expect(e.state.vocabulary['clap']?.['sit']?.strength ?? 0).toBe(0);
    e.recordReward(1);
    expect(e.state.vocabulary['clap']!['sit']!.strength).toBeGreaterThan(0);
  });

  it('a well-trained cue reliably exploits its learned behaviour', async () => {
    // rng = 0 → attemptSucceeds passes for any positive strength, so exploit wins.
    const e = engineWith(seq(0), ['sit', 'spin', 'bark']);
    // Condition clap→spin by repeated gesture+behaviour+reward.
    for (let i = 0; i < 12; i++) {
      e.observeGesture('clap');
      await e.runTrick('spin', ctx);
      e.recordReward(1);
    }
    const strength = e.state.vocabulary['clap']!['spin']!.strength;
    expect(strength).toBeGreaterThan(0.5);
    const r = await e.presentCue('clap', ctx);
    expect(r.success).toBe(true);
    expect(e.state.behaviors.at(-1)?.trickId).toBe('spin');
  });

  it('does nothing only when the dog knows no behaviours at all', async () => {
    const e = createTrainingEngine(seq(0));
    const r = await e.presentCue('clap', ctx);
    expect(r.success).toBe(false);
  });
});

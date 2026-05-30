import { describe, it, expect } from 'vitest';
import {
  STEP_PALETTE,
  makeStep,
  emptyDraft,
  clampRepeat,
  validateDraft,
  buildProgram,
  draftToTrick,
  type TrickDraft,
} from '../../src/training/composer';
import { loadBuiltInPrimitives, getPrimitive } from '../../src/training/registry';

const draft = (over: Partial<TrickDraft> = {}): TrickDraft => ({
  name: 'Trick',
  repeat: 1,
  steps: [makeStep('sit')],
  ...over,
});

describe('composer — palette', () => {
  it('only references primitives that exist in the engine registry', () => {
    loadBuiltInPrimitives();
    for (const entry of STEP_PALETTE) {
      expect(getPrimitive(entry.nodeId), `missing primitive ${entry.nodeId}`).toBeDefined();
    }
    // the wrappers buildProgram emits must exist too
    expect(getPrimitive('seq')).toBeDefined();
    expect(getPrimitive('repeat-n')).toBeDefined();
  });

  it('seeds default args for parameterised steps only', () => {
    expect(makeStep('sit').args).toEqual({});
    expect(makeStep('walk-forward').args).toEqual({ distance: 1 });
    expect(makeStep('pause').args).toEqual({ seconds: 1 });
  });

  it('emptyDraft starts blank and unrepeated', () => {
    expect(emptyDraft()).toEqual({ name: '', repeat: 1, steps: [] });
  });
});

describe('composer — validation', () => {
  it('requires a name and at least one step', () => {
    expect(validateDraft(draft({ name: '   ' }))).toMatch(/name/i);
    expect(validateDraft(draft({ steps: [] }))).toMatch(/step/i);
    expect(validateDraft(draft())).toBeNull();
  });

  it('rejects unknown steps', () => {
    expect(validateDraft(draft({ steps: [{ nodeId: 'fly', args: {} }] }))).toMatch(/unknown/i);
  });

  it('clamps the repeat count into a sane range', () => {
    expect(clampRepeat(0)).toBe(1);
    expect(clampRepeat(3.9)).toBe(3);
    expect(clampRepeat(9999)).toBe(20);
    expect(clampRepeat(NaN)).toBe(1);
  });
});

describe('composer — program lowering', () => {
  it('a single step lowers to that node directly', () => {
    expect(buildProgram(draft({ steps: [makeStep('sit')] }))).toEqual({ nodeId: 'sit' });
  });

  it('multiple steps lower to a sequence in order', () => {
    const prog = buildProgram(
      draft({ steps: [makeStep('sit'), makeStep('spin-cw'), makeStep('bark')] }),
    );
    expect(prog).toEqual({
      nodeId: 'seq',
      children: [{ nodeId: 'sit' }, { nodeId: 'spin-cw' }, { nodeId: 'bark' }],
    });
  });

  it('repeat wraps the body in repeat-n with the clamped count', () => {
    const prog = buildProgram(draft({ repeat: 4, steps: [makeStep('sit'), makeStep('bark')] }));
    expect(prog).toEqual({
      nodeId: 'repeat-n',
      args: { n: 4 },
      children: [{ nodeId: 'seq', children: [{ nodeId: 'sit' }, { nodeId: 'bark' }] }],
    });
  });

  it('carries and clamps parameterised step args', () => {
    const big = makeStep('walk-forward');
    big.args.distance = 999;
    expect(buildProgram(draft({ steps: [big] }))).toEqual({
      nodeId: 'walk-forward',
      args: { distance: 5 },
    });
  });
});

describe('composer — draftToTrick', () => {
  it('produces a player-authored trick with a built program', () => {
    const trick = draftToTrick(draft({ name: '  Twirl  ', steps: [makeStep('spin-cw')] }), 'fixed');
    expect(trick.id).toBe('fixed');
    expect(trick.name).toBe('Twirl');
    expect(trick.authoredBy).toBe('player');
    expect(trick.program).toEqual({ nodeId: 'spin-cw' });
    expect(trick.mastery).toBe(0);
    expect(trick.cueGestureId).toBeUndefined();
  });

  it('binds the chosen cue when set', () => {
    const trick = draftToTrick(draft({ cueGestureId: 'whistle' }));
    expect(trick.cueGestureId).toBe('whistle');
  });

  it('composes a Salto from motor primitives (jump → flip)', () => {
    const t = draftToTrick(
      draft({ name: 'Backflip', steps: [makeStep('jump'), makeStep('flip')] }),
      'salto',
    );
    expect(t.program).toEqual({
      nodeId: 'seq',
      children: [{ nodeId: 'jump' }, { nodeId: 'flip' }],
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { createBelloBrain, buildUserPrompt, describeSituation } from '../../src/ai/bello-brain';
import { parseChoice, type LlmEngine, type LlmChoice } from '../../src/ai/llm';

const ACTIONS = [
  { id: 'sit', name: 'Sit' },
  { id: 'spin', name: 'Spin' },
  { id: 'bark', name: 'Bark' },
];

function fakeEngine(choice: LlmChoice, spy?: (i: { system: string; user: string }) => void): LlmEngine {
  return {
    load: vi.fn(async () => undefined),
    isReady: () => true,
    choose: async ({ system, user, actions }) => {
      spy?.({ system, user });
      // Honour the enum like the real grammar would.
      return actions.includes(choice.action) ? choice : { ...choice, action: actions[0]! };
    },
  };
}

describe('parseChoice', () => {
  it('accepts a valid action and thought', () => {
    expect(parseChoice('{"action":"spin","thought":"weee"}', ['sit', 'spin'])).toEqual({
      action: 'spin',
      thought: 'weee',
    });
  });
  it('throws (no fallback) when the action is invalid or JSON is broken', () => {
    expect(() => parseChoice('{"action":"fly"}', ['sit', 'spin'])).toThrow(/invalid action/);
    expect(() => parseChoice('not json', ['sit', 'spin'])).toThrow(/non-JSON/);
  });
});

describe('describeSituation', () => {
  it('reads the world for the prompt', () => {
    expect(describeSituation({ playerNear: true, ballVisible: true, place: 'Meadow' })).toBe(
      'in the meadow, trainer is close, a ball is out',
    );
    expect(describeSituation({ playerNear: false, ballVisible: false, place: 'Forest' })).toBe(
      'in the forest, trainer is far',
    );
  });
});

describe('buildUserPrompt', () => {
  it('explains there are no memories yet, then includes the cue', () => {
    const p = buildUserPrompt('clap', { playerNear: true, ballVisible: false, place: 'Meadow' }, [], ACTIONS);
    expect(p).toContain('no memories yet');
    expect(p).toContain('"clap"');
    expect(p).toContain('sit, spin, bark');
  });
  it('feeds recent cue -> action -> reward memory back as context', () => {
    const history = [
      { cue: 'clap', situation: 'trainer is close', action: 'sit', reward: 1 },
      { cue: 'whistle', situation: 'trainer is far', action: 'spin', reward: 0 },
    ];
    const p = buildUserPrompt('clap', { playerNear: true, ballVisible: false, place: 'Meadow' }, history, ACTIONS);
    expect(p).toContain('clap -> sit -> rewarded 1');
    expect(p).toContain('whistle -> spin -> ignored');
  });
});

describe('createBelloBrain', () => {
  it('decides an action, remembers it, and exposes the thought', async () => {
    const brain = createBelloBrain(fakeEngine({ action: 'spin', thought: 'I love spinning' }));
    const choice = await brain.decide({
      cue: 'clap',
      situation: { playerNear: true, ballVisible: false, place: 'Meadow' },
      actions: ACTIONS,
    });
    expect(choice.action).toBe('spin');
    expect(brain.lastThought).toBe('I love spinning');
    expect(brain.history).toHaveLength(1);
    expect(brain.history[0]).toMatchObject({ cue: 'clap', action: 'spin', reward: 0 });
  });

  it('reward attaches to the latest memory so it shapes later context', () => {
    const brain = createBelloBrain(fakeEngine({ action: 'sit', thought: '' }));
    return brain
      .decide({ cue: 'clap', situation: { playerNear: true, ballVisible: false, place: 'Meadow' }, actions: ACTIONS })
      .then(() => {
        brain.reward(1);
        expect(brain.history[0]!.reward).toBe(1);
      });
  });

  it('never offers the same trick twice in a row (variety with a tiny model)', async () => {
    const offered: string[][] = [];
    const engine: LlmEngine = {
      load: vi.fn(async () => undefined),
      isReady: () => true,
      choose: async ({ actions }) => {
        offered.push(actions);
        return { action: actions[0]!, thought: '' };
      },
    };
    const brain = createBelloBrain(engine);
    const sit = { cue: 'clap', situation: { playerNear: true, ballVisible: false, place: 'Meadow' }, actions: ACTIONS };
    await brain.decide(sit); // picks 'sit'
    await brain.decide(sit); // must NOT be allowed to pick 'sit' again
    expect(offered[0]).toEqual(['sit', 'spin', 'bark']);
    expect(offered[1]).not.toContain('sit');
    expect(brain.history[1]!.action).not.toBe('sit');
  });

  it('passes the persona + allowed actions to the model', async () => {
    const spy = vi.fn();
    const brain = createBelloBrain(fakeEngine({ action: 'sit', thought: '' }, spy));
    await brain.decide({
      cue: 'clap',
      situation: { playerNear: true, ballVisible: false, place: 'Meadow' },
      actions: ACTIONS,
    });
    expect(spy).toHaveBeenCalledOnce();
    const { system } = spy.mock.calls[0]![0];
    expect(system).toContain('You are Bello');
    expect(system).toContain('sit (Sit)');
  });
});

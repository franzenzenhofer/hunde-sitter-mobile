import { describe, it, expect, vi } from 'vitest';
import {
  createGameRegistry,
  CUES,
  CUE_ICON,
  type GameActionContext,
} from '../../src/actions/game-commands';

function fakeCtx(over: Partial<GameActionContext> = {}): GameActionContext {
  return {
    hasBall: false,
    hasTreat: false,
    ballInPlay: false,
    dogNear: false,
    pet: vi.fn(),
    feed: vi.fn(),
    throwBall: vi.fn(),
    reward: vi.fn(),
    cue: vi.fn(),
    ...over,
  };
}

describe('human action deck', () => {
  it('exposes only human actions: four cues, three rewards, throw - no dog actions', () => {
    const reg = createGameRegistry();
    expect(reg.all().map((c) => c.id)).toEqual([
      'clap',
      'whistle',
      'point',
      'snap',
      'reward',
      'feed',
      'pet',
      'throw',
    ]);
    expect(reg.group('cue').map((c) => c.id)).toEqual(['clap', 'whistle', 'point', 'snap']);
    expect(reg.group('reward').map((c) => c.id)).toEqual(['reward', 'feed', 'pet']);
    expect(reg.group('play').map((c) => c.id)).toEqual(['throw']);
  });

  it('every cue is always available and routes its own id to ctx.cue', () => {
    const reg = createGameRegistry();
    for (const id of CUES) {
      const ctx = fakeCtx();
      expect(reg.get(id)!.canExecute(ctx)).toBe(true);
      expect(reg.get(id)!.icon).toBe(CUE_ICON[id]);
      reg.execute(id, ctx);
      expect(ctx.cue).toHaveBeenCalledWith(id);
    }
  });

  it('Good! reward is always available and grants full strength', () => {
    const reg = createGameRegistry();
    const ctx = fakeCtx();
    expect(reg.get('reward')!.canExecute(ctx)).toBe(true);
    reg.execute('reward', ctx);
    expect(ctx.reward).toHaveBeenCalledWith(1);
  });

  it('treat needs a treat AND proximity', () => {
    const feed = createGameRegistry().get('feed')!;
    expect(feed.canExecute(fakeCtx({ hasTreat: true, dogNear: false }))).toBe(false);
    expect(feed.canExecute(fakeCtx({ hasTreat: false, dogNear: true }))).toBe(false);
    expect(feed.canExecute(fakeCtx({ hasTreat: true, dogNear: true }))).toBe(true);
    const ctx = fakeCtx({ hasTreat: true, dogNear: true });
    feed.execute(ctx);
    expect(ctx.feed).toHaveBeenCalledOnce();
  });

  it('pet is only available near the dog', () => {
    const reg = createGameRegistry();
    expect(reg.get('pet')!.canExecute(fakeCtx({ dogNear: false }))).toBe(false);
    const ctx = fakeCtx({ dogNear: true });
    expect(reg.execute('pet', ctx)).toBe(true);
    expect(ctx.pet).toHaveBeenCalledOnce();
  });

  it('throw needs a ball and no ball already in play', () => {
    const reg = createGameRegistry();
    const t = reg.get('throw')!;
    expect(t.canExecute(fakeCtx({ hasBall: false }))).toBe(false);
    expect(t.canExecute(fakeCtx({ hasBall: true, ballInPlay: true }))).toBe(false);
    expect(t.canExecute(fakeCtx({ hasBall: true, ballInPlay: false }))).toBe(true);
    const ctx = fakeCtx({ hasBall: true });
    reg.execute('throw', ctx);
    expect(ctx.throwBall).toHaveBeenCalledOnce();
  });

  it('reward respects its cooldown so it cannot be spammed in a single tick', () => {
    const reward = createGameRegistry().get('reward')!;
    const ctx = fakeCtx();
    expect(reward.execute(ctx, null, 0)).toBe(true);
    expect(reward.execute(ctx, null, 100)).toBe(false);
    expect(reward.execute(ctx, null, 300)).toBe(true);
  });
});

import { describe, it, expect, vi } from 'vitest';
import {
  createGameRegistry,
  makeTrickCommand,
  trickIcon,
  type GameActionContext,
} from '../../src/actions/game-commands';

function fakeCtx(over: Partial<GameActionContext> = {}): GameActionContext {
  return {
    hasBall: false,
    hasTreat: false,
    ballInPlay: false,
    dogNear: false,
    busy: false,
    pet: vi.fn(),
    feed: vi.fn(),
    throwBall: vi.fn(),
    reward: vi.fn(),
    cue: vi.fn(),
    performTrick: vi.fn(),
    ...over,
  };
}

describe('game command repertoire', () => {
  it('registers the six static commands across care/play/train', () => {
    const reg = createGameRegistry();
    expect(reg.all().map((c) => c.id)).toEqual(['pet', 'feed', 'throw', 'clap', 'whistle', 'reward']);
    expect(reg.group('care').map((c) => c.id)).toEqual(['pet', 'feed']);
    expect(reg.group('play').map((c) => c.id)).toEqual(['throw']);
    expect(reg.group('train').map((c) => c.id)).toEqual(['clap', 'whistle', 'reward']);
  });

  it('pet is only available near the dog and grants love', () => {
    const reg = createGameRegistry();
    expect(reg.get('pet')!.canExecute(fakeCtx({ dogNear: false }))).toBe(false);
    const ctx = fakeCtx({ dogNear: true });
    expect(reg.execute('pet', ctx)).toBe(true);
    expect(ctx.pet).toHaveBeenCalledOnce();
  });

  it('feed needs a treat AND proximity', () => {
    const feed = createGameRegistry().get('feed')!;
    expect(feed.canExecute(fakeCtx({ hasTreat: true, dogNear: false }))).toBe(false);
    expect(feed.canExecute(fakeCtx({ hasTreat: false, dogNear: true }))).toBe(false);
    expect(feed.canExecute(fakeCtx({ hasTreat: true, dogNear: true }))).toBe(true);
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

  it('cues and reward are always available and route to the right handler', () => {
    const reg = createGameRegistry();
    const ctx = fakeCtx();
    expect(reg.get('clap')!.canExecute(ctx)).toBe(true);
    expect(reg.get('whistle')!.canExecute(ctx)).toBe(true);
    expect(reg.get('reward')!.canExecute(ctx)).toBe(true);

    reg.execute('clap', ctx);
    reg.execute('whistle', ctx);
    reg.execute('reward', ctx);
    expect(ctx.cue).toHaveBeenNthCalledWith(1, 'clap');
    expect(ctx.cue).toHaveBeenNthCalledWith(2, 'whistle');
    expect(ctx.reward).toHaveBeenCalledWith(1);
  });

  it('reward respects its cooldown so it cannot be spammed in a single tick', () => {
    const reward = createGameRegistry().get('reward')!;
    const ctx = fakeCtx();
    expect(reward.execute(ctx, null, 0)).toBe(true);
    expect(reward.execute(ctx, null, 100)).toBe(false);
    expect(reward.execute(ctx, null, 300)).toBe(true);
  });
});

describe('trick commands', () => {
  it('performs the trick and is blocked while the dog is busy', () => {
    const cmd = makeTrickCommand({ id: 'sit', name: 'Sit' });
    expect(cmd.id).toBe('trick:sit');
    expect(cmd.label).toBe('Sit');
    expect(cmd.group).toBe('train');

    expect(cmd.canExecute(fakeCtx({ busy: true }))).toBe(false);
    const ctx = fakeCtx({ busy: false });
    expect(cmd.execute(ctx)).toBe(true);
    expect(ctx.performTrick).toHaveBeenCalledWith('sit');
  });

  it('uses a per-trick glyph with a sensible fallback', () => {
    expect(trickIcon('spin')).toBe('🌀');
    expect(makeTrickCommand({ id: 'sit', name: 'Sit' }).icon).toBe('🪑');
    expect(makeTrickCommand({ id: 'rollover', name: 'Roll Over' }).icon).toBe('✨');
  });
});

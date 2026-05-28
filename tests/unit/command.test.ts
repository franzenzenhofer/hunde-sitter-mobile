import { describe, it, expect, vi } from 'vitest';
import { Command, CommandRegistry, type CommandSpec } from '../../src/actions/command';

type Ctx = { ok?: boolean; allow?: boolean };

const make = (over: Partial<CommandSpec<Ctx>> = {}): Command<Ctx> =>
  new Command<Ctx>({ id: 'x', label: 'X', icon: '*', group: 'care', execute: () => {}, ...over });

describe('Command', () => {
  it('requires an id and an execute function', () => {
    // @ts-expect-error intentionally missing id
    expect(() => new Command<Ctx>({ label: 'a', icon: '*', group: 'care', execute: () => {} })).toThrow(
      /id/,
    );
    // @ts-expect-error intentionally missing execute
    expect(() => new Command<Ctx>({ id: 'a', label: 'a', icon: '*', group: 'care' })).toThrow(
      /execute/,
    );
  });

  it('is executable by default with no predicate', () => {
    expect(make().canExecute({}, 0)).toBe(true);
  });

  it('honours the canExecute predicate', () => {
    const cmd = make({ canExecute: (ctx) => !!ctx.ok });
    expect(cmd.canExecute({ ok: true })).toBe(true);
    expect(cmd.canExecute({ ok: false })).toBe(false);
  });

  it('runs execute and reports success, forwarding ctx + target', () => {
    const spy = vi.fn();
    const cmd = make({ execute: spy });
    const ctx: Ctx = { ok: true };
    expect(cmd.execute(ctx, { x: 5, z: 6 })).toBe(true);
    expect(spy).toHaveBeenCalledWith(ctx, { x: 5, z: 6 });
  });

  it('does not run execute when the predicate blocks it', () => {
    const spy = vi.fn();
    const cmd = make({ canExecute: () => false, execute: spy });
    expect(cmd.execute({})).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('exposes its presentation metadata', () => {
    const cmd = make({ label: 'Throw', icon: '🎾', group: 'play', hint: 'fetch!', target: true });
    expect(cmd.label).toBe('Throw');
    expect(cmd.icon).toBe('🎾');
    expect(cmd.group).toBe('play');
    expect(cmd.hint).toBe('fetch!');
    expect(cmd.target).toBe(true);
  });

  describe('cooldown', () => {
    it('blocks until the cooldown elapses', () => {
      const spy = vi.fn();
      const cmd = make({ cooldown: 1000, execute: spy });

      expect(cmd.execute({}, null, 0)).toBe(true);
      expect(cmd.canExecute({}, 500)).toBe(false);
      expect(cmd.execute({}, null, 500)).toBe(false);
      expect(cmd.canExecute({}, 1000)).toBe(true);
      expect(cmd.execute({}, null, 1000)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('reports remaining time and progress', () => {
      const cmd = make({ cooldown: 1000 });
      cmd.execute({}, null, 0);
      expect(cmd.cooldownRemaining(250)).toBe(750);
      expect(cmd.cooldownProgress(250)).toBeCloseTo(0.25);
      expect(cmd.cooldownProgress(2000)).toBe(1);
    });

    it('treats a zero cooldown as always ready', () => {
      const cmd = make();
      cmd.execute({}, null, 100);
      expect(cmd.isReady(100)).toBe(true);
      expect(cmd.cooldownProgress(100)).toBe(1);
    });
  });
});

describe('CommandRegistry', () => {
  const cmd = (id: string, over: Partial<CommandSpec<Ctx>> = {}): Command<Ctx> =>
    new Command<Ctx>({ id, label: id, icon: '*', group: 'care', execute: () => {}, ...over });

  it('registers and retrieves commands in order', () => {
    const a = cmd('a');
    const b = cmd('b');
    const reg = new CommandRegistry<Ctx>([a, b]);
    expect(reg.all()).toEqual([a, b]);
    expect(reg.get('a')).toBe(a);
    expect(reg.get('nope')).toBe(null);
  });

  it('rejects duplicate ids', () => {
    const reg = new CommandRegistry<Ctx>([cmd('a')]);
    expect(() => reg.register(cmd('a'))).toThrow(/Duplicate/);
  });

  it('filters to available commands for the context', () => {
    const reg = new CommandRegistry<Ctx>([
      cmd('always'),
      cmd('blocked', { canExecute: () => false }),
      cmd('conditional', { canExecute: (ctx) => !!ctx.allow }),
    ]);
    const ids = reg.available({ allow: true }).map((c) => c.id);
    expect(ids).toEqual(['always', 'conditional']);
  });

  it('groups commands by their bucket in registration order', () => {
    const reg = new CommandRegistry<Ctx>([
      cmd('pet', { group: 'care' }),
      cmd('throw', { group: 'play' }),
      cmd('feed', { group: 'care' }),
    ]);
    expect(reg.group('care').map((c) => c.id)).toEqual(['pet', 'feed']);
    expect(reg.group('play').map((c) => c.id)).toEqual(['throw']);
    expect(reg.group('train')).toEqual([]);
  });

  it('respects cooldowns when computing availability', () => {
    const reg = new CommandRegistry<Ctx>([cmd('a', { cooldown: 500 })]);
    reg.execute('a', {}, null, 0);
    expect(reg.available({}, 100).map((c) => c.id)).toEqual([]);
    expect(reg.available({}, 600).map((c) => c.id)).toEqual(['a']);
  });

  it('executes by id and forwards the target + context', () => {
    const spy = vi.fn();
    const reg = new CommandRegistry<Ctx>([cmd('go', { execute: spy })]);
    const ctx: Ctx = {};
    expect(reg.execute('go', ctx, { x: 1, z: 2 }, 0)).toBe(true);
    expect(spy).toHaveBeenCalledWith(ctx, { x: 1, z: 2 });
  });

  it('throws on unknown command id', () => {
    const reg = new CommandRegistry<Ctx>();
    expect(() => reg.execute('ghost', {})).toThrow(/Unknown/);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionDock, type DockDeps } from '../../src/ui/action-dock';
import { createGameRegistry, type GameActionContext } from '../../src/actions/game-commands';

type Harness = {
  host: HTMLDivElement;
  ctx: GameActionContext;
  state: { hasBall: boolean; hasTreat: boolean; ballInPlay: boolean; dogNear: boolean };
  counts: { ball: number; treat: number };
  spies: Record<'pet' | 'feed' | 'throwBall' | 'reward' | 'cue', ReturnType<typeof vi.fn>>;
  clock: { t: number };
};

function setup(overrides: Partial<DockDeps> = {}): { harness: Harness; deps: DockDeps } {
  const state = { hasBall: true, hasTreat: true, ballInPlay: false, dogNear: true };
  const counts = { ball: 0, treat: 0 };
  const clock = { t: 0 };
  const spies = {
    pet: vi.fn(),
    feed: vi.fn(),
    throwBall: vi.fn(),
    reward: vi.fn(),
    cue: vi.fn(),
  };
  const ctx: GameActionContext = {
    get hasBall() {
      return state.hasBall;
    },
    get hasTreat() {
      return state.hasTreat;
    },
    get ballInPlay() {
      return state.ballInPlay;
    },
    get dogNear() {
      return state.dogNear;
    },
    ...spies,
  };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const deps: DockDeps = {
    registry: createGameRegistry(),
    context: () => ctx,
    now: () => clock.t,
    counts: () => counts,
    ...overrides,
  };
  return { harness: { host, ctx, state, counts, spies, clock }, deps };
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe('ActionDock - human actions, always visible', () => {
  it('mounts every human command chip and nothing the dog does', () => {
    const { harness, deps } = setup();
    createActionDock(harness.host, deps);
    expect(harness.host.querySelector('#action')).toBeNull(); // no contextual primary
    expect(harness.host.querySelector('#dock-toggle')).toBeNull(); // no toggle
    const ids = [...harness.host.querySelectorAll('.dock-chip')].map((c) =>
      c.getAttribute('data-cmd'),
    );
    expect(ids).toEqual(['clap', 'whistle', 'point', 'snap', 'reward', 'feed', 'pet', 'throw']);
    // No dog-action / trick chips exist.
    expect(harness.host.querySelector('[data-cmd^="trick:"]')).toBeNull();
  });

  it('runs a command on tap', () => {
    const { harness, deps } = setup();
    createActionDock(harness.host, deps);
    harness.host.querySelector<HTMLButtonElement>('[data-cmd="clap"]')!.click();
    expect(harness.spies.cue).toHaveBeenCalledWith('clap');
  });

  it('dims invalid commands and refuses their taps', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    harness.state.dogNear = false; // pet/feed invalid
    dock.sync();
    const pet = harness.host.querySelector<HTMLButtonElement>('[data-cmd="pet"]')!;
    expect(pet.classList.contains('is-disabled')).toBe(true);
    pet.click();
    expect(harness.spies.pet).not.toHaveBeenCalled();
  });

  it('marks a command cooling and refuses re-fire until the cooldown elapses', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    const reward = harness.host.querySelector<HTMLButtonElement>('[data-cmd="reward"]')!;
    reward.click(); // t=0
    expect(harness.spies.reward).toHaveBeenCalledOnce();
    expect(reward.classList.contains('is-cooling')).toBe(true);
    harness.clock.t = 100;
    reward.click();
    expect(harness.spies.reward).toHaveBeenCalledOnce();
    harness.clock.t = 300;
    dock.sync();
    reward.click();
    expect(harness.spies.reward).toHaveBeenCalledTimes(2);
  });

  it('surfaces inventory as badges on Throw (balls) and Treat (treats)', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    harness.counts.ball = 3;
    harness.counts.treat = 0;
    dock.sync();
    const throwBadge = harness.host.querySelector('[data-cmd="throw"] .dock-badge') as HTMLElement;
    const feedBadge = harness.host.querySelector('[data-cmd="feed"] .dock-badge') as HTMLElement;
    expect(throwBadge.hidden).toBe(false);
    expect(throwBadge.textContent).toBe('3');
    expect(feedBadge.hidden).toBe(true);
  });

  it('tags chips by group so cues and rewards read distinctly', () => {
    const { harness, deps } = setup();
    createActionDock(harness.host, deps);
    expect(
      harness.host.querySelector('[data-cmd="clap"]')!.getAttribute('data-group'),
    ).toBe('cue');
    expect(
      harness.host.querySelector('[data-cmd="reward"]')!.getAttribute('data-group'),
    ).toBe('reward');
  });

  it('reports the fired command id via onFire (for sound + animation)', () => {
    const onFire = vi.fn();
    const { harness, deps } = setup({ onFire });
    createActionDock(harness.host, deps);
    harness.host.querySelector<HTMLButtonElement>('[data-cmd="clap"]')!.click();
    expect(onFire).toHaveBeenCalledWith('clap');
    // A blocked command (no ball -> throw invalid) must NOT fire.
    harness.state.hasBall = false;
    onFire.mockClear();
    harness.host.querySelector<HTMLButtonElement>('[data-cmd="throw"]')!.click();
    expect(onFire).not.toHaveBeenCalled();
  });

  it('stops pointer events from reaching the world', () => {
    const { harness, deps } = setup();
    createActionDock(harness.host, deps);
    const windowSpy = vi.fn();
    window.addEventListener('pointerdown', windowSpy);
    try {
      harness.host
        .querySelector('[data-cmd="pet"]')!
        .dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(windowSpy).not.toHaveBeenCalled();
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(windowSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('pointerdown', windowSpy);
    }
  });
});

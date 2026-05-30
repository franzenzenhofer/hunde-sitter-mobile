// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionDock, type DockDeps } from '../../src/ui/action-dock';
import { createGameRegistry, type GameActionContext } from '../../src/actions/game-commands';

type Harness = {
  host: HTMLDivElement;
  ctx: GameActionContext;
  state: { hasBall: boolean; hasTreat: boolean; ballInPlay: boolean; dogNear: boolean; busy: boolean };
  counts: { ball: number; treat: number };
  spies: Record<
    'pet' | 'feed' | 'throwBall' | 'reward' | 'cue' | 'performTrick' | 'teach',
    ReturnType<typeof vi.fn>
  >;
  clock: { t: number };
  tricks: Array<{ id: string; name: string }>;
};

function setup(overrides: Partial<DockDeps> = {}): { harness: Harness; deps: DockDeps } {
  const state = { hasBall: true, hasTreat: true, ballInPlay: false, dogNear: true, busy: false };
  const counts = { ball: 0, treat: 0 };
  const clock = { t: 0 };
  const tricks: Array<{ id: string; name: string }> = [];
  const spies = {
    pet: vi.fn(),
    feed: vi.fn(),
    throwBall: vi.fn(),
    reward: vi.fn(),
    cue: vi.fn(),
    performTrick: vi.fn(),
    teach: vi.fn(),
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
    get busy() {
      return state.busy;
    },
    ...spies,
  };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const deps: DockDeps = {
    registry: createGameRegistry(),
    context: () => ctx,
    now: () => clock.t,
    tricks: () => tricks,
    counts: () => counts,
    ...overrides,
  };
  return { harness: { host, ctx, state, counts, spies, clock, tricks }, deps };
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe('ActionDock — always visible', () => {
  it('mounts the primary + every command chip, with no toggle to hide them', () => {
    const { harness, deps } = setup();
    createActionDock(harness.host, deps);
    expect(harness.host.querySelector('#action')).toBeTruthy();
    expect(harness.host.querySelector('#dock-toggle')).toBeNull();
    const ids = [...harness.host.querySelectorAll('.dock-chip')].map((c) =>
      c.getAttribute('data-cmd'),
    );
    expect(ids).toEqual(['pet', 'feed', 'throw', 'clap', 'whistle', 'reward', 'teach']);
  });

  it('runs a command on tap without opening anything', () => {
    const { harness, deps } = setup();
    createActionDock(harness.host, deps);
    harness.host.querySelector<HTMLButtonElement>('[data-cmd="pet"]')!.click();
    expect(harness.spies.pet).toHaveBeenCalledOnce();
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

  it('surfaces inventory as badges on Throw (balls) and Feed (treats)', () => {
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

  it('reflects and fires the contextual primary', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    const onPrimary = vi.fn();
    dock.onPrimary(onPrimary);
    dock.setPrimary('🎾', 'Throw', true);
    const action = harness.host.querySelector<HTMLButtonElement>('#action')!;
    expect(action.querySelector('.action-ico')!.textContent).toBe('🎾');
    expect(action.querySelector('.action-lbl')!.textContent).toBe('Throw');
    dock.setPrimary('⏳', '...', false);
    expect(action.classList.contains('is-off')).toBe(true);
    action.click();
    expect(onPrimary).toHaveBeenCalledOnce();
  });

  it('renders dynamic trick chips and runs them, blocking while busy', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    harness.tricks.push({ id: 'salto', name: 'Salto' });
    dock.refreshTricks();
    const salto = harness.host.querySelector<HTMLButtonElement>('[data-cmd="trick:salto"]')!;
    expect(salto.querySelector('.dock-lbl')!.textContent).toBe('Salto');
    salto.click();
    expect(harness.spies.performTrick).toHaveBeenCalledWith('salto');

    harness.clock.t = 400; // past the trick's tap cooldown
    harness.state.busy = true;
    dock.sync();
    expect(salto.classList.contains('is-disabled')).toBe(true);
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

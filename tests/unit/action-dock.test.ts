// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionDock, type DockDeps } from '../../src/ui/action-dock';
import { createGameRegistry, type GameActionContext } from '../../src/actions/game-commands';

type Harness = {
  host: HTMLDivElement;
  ctx: GameActionContext;
  state: { hasBall: boolean; hasTreat: boolean; ballInPlay: boolean; dogNear: boolean; busy: boolean };
  spies: Record<'pet' | 'feed' | 'throwBall' | 'reward' | 'cue' | 'performTrick', ReturnType<typeof vi.fn>>;
  clock: { t: number };
  tricks: Array<{ id: string; name: string }>;
};

function setup(overrides: Partial<DockDeps> = {}): { harness: Harness; deps: DockDeps } {
  const state = { hasBall: true, hasTreat: true, ballInPlay: false, dogNear: true, busy: false };
  const clock = { t: 0 };
  const tricks: Array<{ id: string; name: string }> = [];
  const spies = {
    pet: vi.fn(),
    feed: vi.fn(),
    throwBall: vi.fn(),
    reward: vi.fn(),
    cue: vi.fn(),
    performTrick: vi.fn(),
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
    ...overrides,
  };
  return { harness: { host, ctx, state, spies, clock, tricks }, deps };
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe('ActionDock — structure', () => {
  it('mounts a primary button + toggle, tray closed by default', () => {
    const { harness, deps } = setup();
    createActionDock(harness.host, deps);
    expect(harness.host.querySelector('#action')).toBeTruthy();
    expect(harness.host.querySelector('#dock-toggle')).toBeTruthy();
    expect(harness.host.querySelector('#dock')!.classList.contains('is-open')).toBe(false);
  });

  it('opens and closes the tray via the toggle, updating aria', () => {
    const { harness, deps } = setup();
    createActionDock(harness.host, deps);
    const dock = harness.host.querySelector('#dock')!;
    const toggle = harness.host.querySelector<HTMLButtonElement>('#dock-toggle')!;

    toggle.click();
    expect(dock.classList.contains('is-open')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    expect(dock.classList.contains('is-open')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders every static command as a chip in its group', () => {
    const { harness, deps } = setup();
    createActionDock(harness.host, deps);
    const ids = [...harness.host.querySelectorAll('.dock-chip')].map((c) =>
      c.getAttribute('data-cmd'),
    );
    expect(ids).toEqual(['pet', 'feed', 'throw', 'clap', 'whistle', 'reward']);
  });
});

describe('ActionDock — behaviour', () => {
  it('runs the command behind a chip and fires its handler', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    dock.open();
    harness.host.querySelector<HTMLButtonElement>('[data-cmd="pet"]')!.click();
    expect(harness.spies.pet).toHaveBeenCalledOnce();
  });

  it('dims chips whose predicate fails and blocks their clicks', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    dock.open();

    harness.state.dogNear = false; // pet + feed become invalid
    dock.sync();
    const pet = harness.host.querySelector<HTMLButtonElement>('[data-cmd="pet"]')!;
    expect(pet.classList.contains('is-disabled')).toBe(true);

    pet.click(); // pointer-events:none in the browser; logic must also refuse
    expect(harness.spies.pet).not.toHaveBeenCalled();
  });

  it('marks a command as cooling and refuses re-fire until the cooldown elapses', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    dock.open();
    const reward = harness.host.querySelector<HTMLButtonElement>('[data-cmd="reward"]')!;

    reward.click(); // t=0
    expect(harness.spies.reward).toHaveBeenCalledOnce();
    expect(reward.classList.contains('is-cooling')).toBe(true);

    harness.clock.t = 100;
    reward.click(); // still cooling (250ms)
    expect(harness.spies.reward).toHaveBeenCalledOnce();

    harness.clock.t = 300;
    dock.sync();
    expect(reward.classList.contains('is-cooling')).toBe(false);
    reward.click();
    expect(harness.spies.reward).toHaveBeenCalledTimes(2);
  });

  it('reflects the primary contextual action', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    const onPrimary = vi.fn();
    dock.onPrimary(onPrimary);
    dock.setPrimary('🎾', 'Throw', true);

    const action = harness.host.querySelector<HTMLButtonElement>('#action')!;
    expect(action.querySelector('.action-ico')!.textContent).toBe('🎾');
    expect(action.querySelector('.action-lbl')!.textContent).toBe('Throw');
    expect(action.classList.contains('is-off')).toBe(false);

    dock.setPrimary('⏳', '...', false);
    expect(action.classList.contains('is-off')).toBe(true);

    action.click();
    expect(onPrimary).toHaveBeenCalledOnce();
  });

  it('renders dynamic trick chips and runs them on tap', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    harness.tricks.push({ id: 'sit', name: 'Sit' }, { id: 'spin', name: 'Spin' });
    dock.refreshTricks();
    dock.open();

    const sit = harness.host.querySelector<HTMLButtonElement>('[data-cmd="trick:sit"]')!;
    expect(sit).toBeTruthy();
    expect(sit.querySelector('.dock-lbl')!.textContent).toBe('Sit');
    sit.click();
    expect(harness.spies.performTrick).toHaveBeenCalledWith('sit');
  });

  it('blocks trick chips while the dog is busy', () => {
    const { harness, deps } = setup();
    const dock = createActionDock(harness.host, deps);
    harness.tricks.push({ id: 'sit', name: 'Sit' });
    dock.refreshTricks();
    dock.open();

    harness.state.busy = true;
    dock.sync();
    const sit = harness.host.querySelector<HTMLButtonElement>('[data-cmd="trick:sit"]')!;
    expect(sit.classList.contains('is-disabled')).toBe(true);
    sit.click();
    expect(harness.spies.performTrick).not.toHaveBeenCalled();
  });
});

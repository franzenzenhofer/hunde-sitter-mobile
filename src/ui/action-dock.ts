/**
 * The Action Dock - the human's whole interface to training Bello.
 *
 * Principle: everything the *human* can do is always on screen. There are no
 * dog-action buttons (the dog decides what to do) and no editor. The deck is
 * just the human's cues and rewards, lit when usable and dimmed when not, so
 * the player's full range is seen rather than discovered.
 *
 * The surface is a pure render of (registry, context): add a Command and it
 * simply appears.
 */
import type { GameActionContext, GameCommand, GameRegistry } from '../actions/game-commands';
import { button, injectStyleOnce, vibrate } from './dom';

export type DockDeps = {
  registry: GameRegistry;
  /** The live game context, rebuilt by the caller each tick. */
  context: () => GameActionContext;
  /** Monotonic clock in ms (cooldowns use the same source as execute). */
  now: () => number;
  /** Carried inventory, surfaced as badges on the Throw / Treat chips. */
  counts: () => { ball: number; treat: number };
  /** Called with a command id when it successfully fires (for sound + animation). */
  onFire?: (id: string) => void;
};

export type ActionDock = {
  el: HTMLDivElement;
  /** Refresh availability + cooldown + badge visuals; call once per frame. */
  sync(): void;
  destroy(): void;
};

type Chip = { cmd: GameCommand; el: HTMLButtonElement; ring: HTMLDivElement; badge: HTMLSpanElement };

/** Which carried resource (if any) a command shows as a badge. */
const BADGE_OF: Record<string, 'ball' | 'treat'> = { throw: 'ball', feed: 'treat' };

export function createActionDock(host: HTMLElement, deps: DockDeps): ActionDock {
  injectStyleOnce('dock-style', DOCK_CSS);

  const el = document.createElement('div');
  el.id = 'dock';
  // Keep dock interactions from reaching the window-level camera-drag / joystick
  // listeners, so using the UI never moves the world.
  el.addEventListener('pointerdown', (e) => e.stopPropagation());

  const rail = document.createElement('div');
  rail.id = 'dock-rail';
  rail.setAttribute('role', 'group');
  rail.setAttribute('aria-label', 'Trainer actions');

  const chips: Chip[] = [];

  const runCmd = (cmd: GameCommand): void => {
    const ok = cmd.execute(deps.context(), null, deps.now());
    if (ok) {
      vibrate(12);
      flash(chips, cmd.id);
      deps.onFire?.(cmd.id);
    }
    api.sync();
  };

  const buildChip = (cmd: GameCommand): Chip => {
    const btn = button({
      className: 'dock-chip',
      ariaLabel: `${cmd.label}${cmd.hint ? ` - ${cmd.hint}` : ''}`,
      title: cmd.hint,
      onClick: () => runCmd(cmd),
    });
    btn.dataset.cmd = cmd.id;
    btn.dataset.group = cmd.group;

    const ring = document.createElement('div');
    ring.className = 'dock-ring';
    const icon = document.createElement('span');
    icon.className = 'dock-ico';
    icon.textContent = cmd.icon;
    const label = document.createElement('span');
    label.className = 'dock-lbl';
    label.textContent = cmd.label;
    const badge = document.createElement('span');
    badge.className = 'dock-badge';
    badge.hidden = true;
    btn.append(ring, icon, label, badge);
    return { cmd, el: btn, ring, badge };
  };

  for (const cmd of deps.registry.all()) {
    const chip = buildChip(cmd);
    chips.push(chip);
    rail.appendChild(chip.el);
  }

  el.append(rail);
  host.appendChild(el);

  const setBadge = (chip: Chip, n: number): void => {
    if (n > 0) {
      chip.badge.textContent = String(n);
      chip.badge.hidden = false;
    } else {
      chip.badge.hidden = true;
    }
  };

  const api: ActionDock = {
    el,
    sync() {
      const ctx = deps.context();
      const now = deps.now();
      const counts = deps.counts();
      for (const chip of chips) {
        const { cmd, el: btn, ring } = chip;
        const ready = cmd.isReady(now);
        const valid = cmd.canExecute(ctx, now);
        btn.classList.toggle('is-disabled', !valid && ready);
        btn.classList.toggle('is-cooling', !ready);
        if (!ready) {
          const p = cmd.cooldownProgress(now);
          ring.style.background = `conic-gradient(rgba(255,255,255,0.85) ${p * 360}deg, rgba(0,0,0,0.18) 0deg)`;
        } else if (ring.style.background) {
          ring.style.background = '';
        }
        const resource = BADGE_OF[cmd.id];
        if (resource) setBadge(chip, counts[resource]);
      }
    },
    destroy() {
      el.remove();
    },
  };

  return api;
}

function flash(chips: Chip[], id: string): void {
  const chip = chips.find((c) => c.cmd.id === id);
  if (!chip) return;
  chip.el.classList.remove('did-fire');
  // Reflow so the animation re-triggers on rapid repeats.
  void chip.el.offsetWidth;
  chip.el.classList.add('did-fire');
}

const DOCK_CSS = `
#dock { position: absolute; inset: 0; pointer-events: none; }
#dock > * { pointer-events: auto; }

#dock-rail {
  position: absolute;
  left: 50%; transform: translateX(-50%);
  bottom: calc(20px + env(safe-area-inset-bottom));
  max-width: min(560px, calc(100vw - 24px));
  display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: flex-end;
  padding: 8px 10px;
  background: rgba(255,255,255,0.30);
  border-radius: 18px;
  backdrop-filter: blur(6px);
}

.dock-chip {
  position: relative; width: 58px; height: 58px; flex: 0 0 auto;
  border: none; border-radius: 14px; cursor: pointer;
  background: rgba(255,255,255,0.88);
  box-shadow: 0 2px 6px rgba(0,0,0,0.14);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  transition: transform 90ms ease, opacity 160ms ease, filter 160ms ease;
}
/* Cues read as the "say something" group; rewards as the "good dog" group. */
.dock-chip[data-group="cue"] { background: rgba(214,233,255,0.92); }
.dock-chip[data-group="reward"] { background: rgba(255,233,209,0.92); }
.dock-chip:active { transform: scale(0.92); }
.dock-chip .dock-ico { font-size: 24px; line-height: 1; }
.dock-chip .dock-lbl {
  font: 700 9px -apple-system, sans-serif; color: #2a2a2a;
  max-width: 54px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dock-chip.is-disabled { opacity: 0.34; filter: grayscale(0.85); pointer-events: none; }
.dock-chip.is-cooling { pointer-events: none; }
.dock-ring {
  position: absolute; inset: 0; border-radius: 14px; opacity: 0;
  -webkit-mask: radial-gradient(transparent 62%, #000 64%);
  mask: radial-gradient(transparent 62%, #000 64%);
  transition: opacity 120ms ease;
}
.dock-chip.is-cooling .dock-ring { opacity: 0.9; }
.dock-badge {
  position: absolute; top: -5px; right: -5px; min-width: 17px; height: 17px; padding: 0 4px;
  box-sizing: border-box; border-radius: 9px; background: #ff5a5a; color: #fff;
  font: 800 10px -apple-system, sans-serif; line-height: 17px; text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

@keyframes dock-fire {
  0% { box-shadow: 0 0 0 0 rgba(255,170,90,0.9); }
  100% { box-shadow: 0 0 0 12px rgba(255,170,90,0); }
}
.dock-chip.did-fire { animation: dock-fire 380ms ease-out; }
`;

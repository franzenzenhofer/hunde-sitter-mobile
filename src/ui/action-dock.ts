/**
 * The Action Dock — the player's whole interface to the dog.
 *
 * Principle: everything the player can do is *always visible*. There is no
 * open/close — the full repertoire (care, play, cues, reward, every trick,
 * teach) sits on screen at all times, lit when available and dimmed when not,
 * so the range is seen rather than discovered. A big contextual PRIMARY button
 * emphasises the single smartest action for one-thumb play; inventory counts
 * ride as badges on the relevant chips, so nothing needs its own widget.
 *
 * The surface is a pure render of (registry, context): add a Command or teach a
 * trick and it simply appears.
 */
import type { GameActionContext, GameCommand, GameRegistry } from '../actions/game-commands';
import { makeTrickCommand } from '../actions/game-commands';
import { button, injectStyleOnce, vibrate } from './dom';

export type DockDeps = {
  registry: GameRegistry;
  /** The live game context, rebuilt by the caller each tick. */
  context: () => GameActionContext;
  /** Monotonic clock in ms (cooldowns use the same source as execute). */
  now: () => number;
  /** Current known tricks, in display order. */
  tricks: () => Array<{ id: string; name: string }>;
  /** Carried inventory, surfaced as badges on the Throw / Feed chips. */
  counts: () => { ball: number; treat: number };
};

export type ActionDock = {
  el: HTMLDivElement;
  setPrimary(icon: string, label: string, enabled: boolean): void;
  onPrimary(cb: () => void): () => void;
  /** Refresh availability + cooldown + badge visuals; call once per frame. */
  sync(): void;
  /** Rebuild the dynamic trick chips from deps.tricks(). */
  refreshTricks(): void;
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

  // The always-visible chip rail: every command, in registration order.
  const rail = document.createElement('div');
  rail.id = 'dock-rail';
  rail.setAttribute('role', 'group');
  rail.setAttribute('aria-label', 'Dog commands');

  const staticChips: Chip[] = [];
  let trickChips: Chip[] = [];
  const allChips = (): Chip[] => [...staticChips, ...trickChips];

  const runCmd = (cmd: GameCommand): void => {
    const ok = cmd.execute(deps.context(), null, deps.now());
    if (ok) {
      vibrate(12);
      flash(allChips(), cmd.id);
    }
    api.sync();
  };

  const buildChip = (cmd: GameCommand): Chip => {
    const btn = button({
      className: 'dock-chip',
      ariaLabel: `${cmd.label}${cmd.hint ? ` — ${cmd.hint}` : ''}`,
      title: cmd.hint,
      onClick: () => runCmd(cmd),
    });
    btn.dataset.cmd = cmd.id;

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
    staticChips.push(chip);
    rail.appendChild(chip.el);
  }

  // --- the emphasised contextual primary -------------------------------------
  const primaryHandlers = new Set<() => void>();
  const primary = button({
    onClick: () => {
      for (const h of primaryHandlers) h();
      vibrate(12);
    },
  });
  primary.id = 'action';
  const primaryIcon = document.createElement('span');
  primaryIcon.className = 'action-ico';
  primaryIcon.textContent = '🐾';
  const primaryLabel = document.createElement('span');
  primaryLabel.className = 'action-lbl';
  primaryLabel.textContent = 'Act';
  primary.append(primaryIcon, primaryLabel);

  el.append(rail, primary);
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
    setPrimary(icon, label, enabled) {
      primaryIcon.textContent = icon;
      primaryLabel.textContent = label;
      primary.classList.toggle('is-off', !enabled);
    },
    onPrimary(cb) {
      primaryHandlers.add(cb);
      return () => primaryHandlers.delete(cb);
    },
    sync() {
      const ctx = deps.context();
      const now = deps.now();
      const counts = deps.counts();
      for (const chip of allChips()) {
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
    refreshTricks() {
      const want = deps.tricks();
      const unchanged =
        want.length === trickChips.length &&
        want.every((t, i) => trickChips[i]?.cmd.id === `trick:${t.id}`);
      if (unchanged) return; // avoid needless DOM churn on the polling interval
      for (const c of trickChips) c.el.remove();
      trickChips = [];
      for (const t of want) {
        const chip = buildChip(makeTrickCommand(t));
        trickChips.push(chip);
        rail.appendChild(chip.el);
      }
      api.sync();
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
  right: calc(20px + env(safe-area-inset-right));
  bottom: calc(140px + env(safe-area-inset-bottom));
  width: min(300px, calc(100vw - 100px));
  display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; align-content: flex-end;
}

#action {
  position: absolute;
  right: calc(20px + env(safe-area-inset-right));
  bottom: calc(28px + env(safe-area-inset-bottom));
  width: 92px; height: 92px; border-radius: 50%;
  background: linear-gradient(180deg, #ffd86b, #ff9a5a);
  border: 3px solid #fff; color: #2a2a2a; cursor: pointer;
  box-shadow: 0 6px 16px rgba(0,0,0,0.22);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  touch-action: manipulation; transition: transform 90ms ease, filter 160ms ease, opacity 160ms ease;
}
#action:active { transform: translateY(2px) scale(0.97); }
#action .action-ico { font-size: 29px; line-height: 1; }
#action .action-lbl {
  font: 800 12px -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: 0.04em; text-transform: uppercase;
}
#action.is-off { filter: grayscale(0.7); opacity: 0.72; }

.dock-chip {
  position: relative; width: 54px; height: 54px; flex: 0 0 auto;
  border: none; border-radius: 13px; cursor: pointer;
  background: rgba(255,255,255,0.82);
  box-shadow: 0 2px 6px rgba(0,0,0,0.14);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  transition: transform 90ms ease, opacity 160ms ease, filter 160ms ease;
}
.dock-chip:active { transform: scale(0.92); }
.dock-chip .dock-ico { font-size: 22px; line-height: 1; }
.dock-chip .dock-lbl {
  font: 700 9px -apple-system, sans-serif; color: #2a2a2a;
  max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dock-chip.is-disabled { opacity: 0.34; filter: grayscale(0.85); pointer-events: none; }
.dock-chip.is-cooling { pointer-events: none; }
.dock-ring {
  position: absolute; inset: 0; border-radius: 13px; opacity: 0;
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

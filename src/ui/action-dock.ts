/**
 * The Action Dock — the player's whole interface to the dog.
 *
 * Layout (thumb-first, mobile):
 *   - a big contextual PRIMARY button bottom-right (the smart quick action:
 *     Throw / Pet / Feed) for one-tap play;
 *   - a TOGGLE that opens a compact, grouped command tray (Care / Play / Train)
 *     exposing the full repertoire — including cues, reward and every trick the
 *     dog knows. The tray is a pure render of (registry, context): every command
 *     shows, the valid ones light up, cooldowns sweep, the rest dim out.
 *
 * Adding a Command (or teaching a new trick) makes it appear here for free, so
 * the UI scales to the full potential of the programmable dog simulator.
 */
import type {
  GameActionContext,
  GameCommand,
  GameRegistry,
} from '../actions/game-commands';
import { makeTrickCommand } from '../actions/game-commands';
import type { CommandGroup } from '../actions/command';

export type DockDeps = {
  registry: GameRegistry;
  /** The live game context, rebuilt by the caller each tick. */
  context: () => GameActionContext;
  /** Monotonic clock in ms (cooldowns use the same source as execute). */
  now: () => number;
  /** Current known tricks, in display order. */
  tricks: () => Array<{ id: string; name: string }>;
};

export type ActionDock = {
  el: HTMLDivElement;
  setPrimary(icon: string, label: string, enabled: boolean): void;
  onPrimary(cb: () => void): () => void;
  /** Refresh availability + cooldown visuals; call once per frame. */
  sync(): void;
  /** Rebuild the dynamic trick chips from deps.tricks(). */
  refreshTricks(): void;
  open(): void;
  close(): void;
  destroy(): void;
};

type Chip = { cmd: GameCommand; el: HTMLButtonElement; ring: HTMLDivElement };

const GROUPS: Array<{ id: CommandGroup; label: string }> = [
  { id: 'care', label: 'Care' },
  { id: 'play', label: 'Play' },
  { id: 'train', label: 'Train' },
];

export function createActionDock(host: HTMLElement, deps: DockDeps): ActionDock {
  injectStyle();

  const el = document.createElement('div');
  el.id = 'dock';
  // Keep dock interactions (taps, tray scrolling) from reaching the window-level
  // camera-drag / joystick listeners, so using the UI never moves the world.
  el.addEventListener('pointerdown', (e) => e.stopPropagation());

  // Tap-anywhere scrim that closes the tray (kept under the tray + buttons).
  const scrim = document.createElement('div');
  scrim.id = 'dock-scrim';
  scrim.addEventListener('pointerdown', () => api.close());

  const tray = document.createElement('div');
  tray.id = 'dock-tray';
  tray.setAttribute('role', 'group');
  tray.setAttribute('aria-label', 'Dog commands');

  // Section bodies, keyed by group, so trick chips can be re-rendered in place.
  const sectionBody = new Map<CommandGroup, HTMLDivElement>();
  for (const g of GROUPS) {
    const section = document.createElement('div');
    section.className = 'dock-section';
    const title = document.createElement('div');
    title.className = 'dock-section-title';
    title.textContent = g.label;
    const body = document.createElement('div');
    body.className = 'dock-row';
    section.append(title, body);
    tray.appendChild(section);
    sectionBody.set(g.id, body);
  }

  const staticChips: Chip[] = [];
  let trickChips: Chip[] = [];
  const allChips = (): Chip[] => [...staticChips, ...trickChips];

  const runCmd = (cmd: GameCommand): void => {
    const ok = cmd.execute(deps.context(), null, deps.now());
    if (ok) {
      vibrate(12);
      flash(cmd.id.startsWith('trick:') ? trickChips : staticChips, cmd.id);
    }
    api.sync();
  };

  const buildChip = (cmd: GameCommand): Chip => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dock-chip';
    btn.dataset.cmd = cmd.id;
    btn.setAttribute('aria-label', `${cmd.label}${cmd.hint ? ` — ${cmd.hint}` : ''}`);
    btn.title = cmd.hint;

    const ring = document.createElement('div');
    ring.className = 'dock-ring';
    const icon = document.createElement('span');
    icon.className = 'dock-ico';
    icon.textContent = cmd.icon;
    const label = document.createElement('span');
    label.className = 'dock-lbl';
    label.textContent = cmd.label;
    btn.append(ring, icon, label);
    btn.addEventListener('click', () => runCmd(cmd));
    return { cmd, el: btn, ring };
  };

  for (const cmd of deps.registry.all()) {
    const chip = buildChip(cmd);
    staticChips.push(chip);
    sectionBody.get(cmd.group)?.appendChild(chip.el);
  }

  // --- button cluster --------------------------------------------------------
  const cluster = document.createElement('div');
  cluster.id = 'dock-cluster';

  const toggle = document.createElement('button');
  toggle.id = 'dock-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open command tray');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = '🐾';
  if (!dockSeen()) toggle.classList.add('hint-pulse');
  toggle.addEventListener('click', () => (open ? api.close() : api.open()));

  const primary = document.createElement('button');
  primary.id = 'action';
  primary.type = 'button';
  const primaryIcon = document.createElement('span');
  primaryIcon.className = 'action-ico';
  primaryIcon.textContent = '🐾';
  const primaryLabel = document.createElement('span');
  primaryLabel.className = 'action-lbl';
  primaryLabel.textContent = 'Act';
  primary.append(primaryIcon, primaryLabel);
  const primaryHandlers = new Set<() => void>();
  primary.addEventListener('click', () => {
    for (const h of primaryHandlers) h();
    vibrate(12);
  });

  cluster.append(toggle, primary);
  el.append(scrim, tray, cluster);
  host.appendChild(el);

  let open = false;

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
      if (!open) return; // chips are hidden — skip the per-frame DOM work
      for (const { cmd, el: chip, ring } of allChips()) {
        const ready = cmd.isReady(now);
        const valid = cmd.canExecute(ctx, now);
        chip.classList.toggle('is-disabled', !valid && ready);
        chip.classList.toggle('is-cooling', !ready);
        if (!ready) {
          const p = cmd.cooldownProgress(now);
          ring.style.background = `conic-gradient(rgba(255,255,255,0.85) ${p * 360}deg, rgba(0,0,0,0.18) 0deg)`;
        } else if (ring.style.background) {
          ring.style.background = '';
        }
      }
    },
    refreshTricks() {
      const want = deps.tricks();
      const unchanged =
        want.length === trickChips.length &&
        want.every((t, i) => trickChips[i]?.cmd.id === `trick:${t.id}`);
      if (unchanged) return; // avoid needless DOM churn on the polling interval
      const body = sectionBody.get('train');
      for (const c of trickChips) c.el.remove();
      trickChips = [];
      for (const t of want) {
        const chip = buildChip(makeTrickCommand(t));
        trickChips.push(chip);
        body?.appendChild(chip.el);
      }
      if (open) api.sync();
    },
    open() {
      open = true;
      el.classList.add('is-open');
      toggle.classList.remove('hint-pulse');
      markDockSeen();
      toggle.textContent = '✕';
      toggle.setAttribute('aria-label', 'Close command tray');
      toggle.setAttribute('aria-expanded', 'true');
      api.sync();
    },
    close() {
      open = false;
      el.classList.remove('is-open');
      toggle.textContent = '🐾';
      toggle.setAttribute('aria-label', 'Open command tray');
      toggle.setAttribute('aria-expanded', 'false');
    },
    destroy() {
      el.remove();
    },
  };

  return api;
}

const DOCK_SEEN_KEY = 'hs:dock-seen';
function dockSeen(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(DOCK_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
function markDockSeen(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(DOCK_SEEN_KEY, '1');
  } catch {
    /* storage unavailable — ignore */
  }
}

function vibrate(ms: number): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
  }
}

function flash(chips: Chip[], id: string): void {
  const chip = chips.find((c) => c.cmd.id === id);
  if (!chip) return;
  chip.el.classList.remove('did-fire');
  // Reflow so the animation re-triggers on rapid repeats.
  void chip.el.offsetWidth;
  chip.el.classList.add('did-fire');
}

let styleInjected = false;
function injectStyle(): void {
  if (styleInjected || typeof document === 'undefined') return;
  styleInjected = true;
  const css = `
#dock { position: absolute; inset: 0; pointer-events: none; }
#dock > * { pointer-events: auto; }

#dock-scrim {
  position: absolute; inset: 0; pointer-events: none;
  background: rgba(20,28,38,0.18); opacity: 0; transition: opacity 160ms ease;
}
#dock.is-open #dock-scrim { opacity: 1; pointer-events: auto; }

#dock-cluster {
  position: absolute;
  right: calc(20px + env(safe-area-inset-right));
  bottom: calc(28px + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; align-items: center; gap: 14px;
}
#dock-toggle {
  width: 60px; height: 60px; border-radius: 50%;
  background: rgba(255,255,255,0.82); border: 3px solid #fff; color: #2a2a2a;
  font-size: 26px; line-height: 1; cursor: pointer;
  box-shadow: 0 6px 16px rgba(0,0,0,0.22);
  transition: transform 120ms ease, background 160ms ease;
  display: flex; align-items: center; justify-content: center;
}
#dock-toggle:active { transform: scale(0.92); }
#dock.is-open #dock-toggle { background: #fff; transform: rotate(90deg); }
#dock-toggle.hint-pulse { animation: dock-hint 1.7s ease-in-out infinite; }
@keyframes dock-hint {
  0%   { box-shadow: 0 6px 16px rgba(0,0,0,0.22), 0 0 0 0 rgba(255,154,90,0.55); }
  70%  { box-shadow: 0 6px 16px rgba(0,0,0,0.22), 0 0 0 16px rgba(255,154,90,0); }
  100% { box-shadow: 0 6px 16px rgba(0,0,0,0.22), 0 0 0 0 rgba(255,154,90,0); }
}

#action {
  position: static; inset: auto;
  width: 96px; height: 96px; border-radius: 50%;
  background: linear-gradient(180deg, #ffd86b, #ff9a5a);
  border: 3px solid #fff; color: #2a2a2a; cursor: pointer;
  box-shadow: 0 6px 16px rgba(0,0,0,0.22);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  touch-action: manipulation; transition: transform 90ms ease, filter 160ms ease, opacity 160ms ease;
}
#action:active { transform: translateY(2px) scale(0.97); }
#action .action-ico { font-size: 30px; line-height: 1; }
#action .action-lbl {
  font: 800 12px -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: 0.04em; text-transform: uppercase;
}
#action.is-off { filter: grayscale(0.7); opacity: 0.7; }

#dock-tray {
  position: absolute;
  right: calc(20px + env(safe-area-inset-right));
  bottom: calc(116px + env(safe-area-inset-bottom));
  width: min(290px, calc(100vw - 32px));
  max-height: 56vh; overflow-y: auto;
  padding: 12px 12px 6px;
  background: rgba(255,255,255,0.66);
  border-radius: 18px; backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.22);
  transform: translateY(14px) scale(0.96); transform-origin: bottom right;
  opacity: 0; pointer-events: none; transition: opacity 160ms ease, transform 180ms ease;
}
#dock.is-open #dock-tray { opacity: 1; transform: none; pointer-events: auto; }

.dock-section { margin-bottom: 8px; }
.dock-section-title {
  font: 800 9px -apple-system, sans-serif; letter-spacing: 0.12em;
  text-transform: uppercase; color: #6a6a72; margin: 2px 2px 6px;
}
.dock-row { display: flex; flex-wrap: wrap; gap: 8px; }

.dock-chip {
  position: relative; width: 66px; height: 66px; flex: 0 0 auto;
  border: none; border-radius: 14px; cursor: pointer;
  background: rgba(255,255,255,0.92);
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  transition: transform 90ms ease, opacity 160ms ease, filter 160ms ease;
}
.dock-chip:active { transform: scale(0.93); }
.dock-chip .dock-ico { font-size: 26px; line-height: 1; }
.dock-chip .dock-lbl {
  font: 700 10px -apple-system, sans-serif; color: #2a2a2a;
  max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dock-chip.is-disabled { opacity: 0.32; filter: grayscale(0.85); pointer-events: none; }
.dock-chip.is-cooling { pointer-events: none; }
.dock-ring {
  position: absolute; inset: 0; border-radius: 14px; opacity: 0;
  -webkit-mask: radial-gradient(transparent 64%, #000 66%);
  mask: radial-gradient(transparent 64%, #000 66%);
  transition: opacity 120ms ease;
}
.dock-chip.is-cooling .dock-ring { opacity: 0.9; }

@keyframes dock-fire {
  0% { box-shadow: 0 0 0 0 rgba(255,170,90,0.9); }
  100% { box-shadow: 0 0 0 14px rgba(255,170,90,0); }
}
.dock-chip.did-fire { animation: dock-fire 380ms ease-out; }
`;
  const style = document.createElement('style');
  style.id = 'dock-style';
  style.textContent = css;
  document.head.appendChild(style);
}

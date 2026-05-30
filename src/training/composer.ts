/**
 * Trick Composer model — the programmable heart of the game.
 *
 * Players assemble a TrickDraft: an ordered list of action steps (some with a
 * numeric argument) and an optional Repeat count. {@link buildProgram} lowers
 * that draft into a real {@link Program} on the engine's node language, so an
 * authored trick is executed, cued, reinforced and persisted exactly like a
 * built-in one. This file is pure data → no DOM, fully unit-tested.
 */
import type { Program, Trick } from './types';
import { newTrick } from './trick';

export type StepArgSpec = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
};

export type PaletteEntry = {
  nodeId: string;
  name: string;
  icon: string;
  arg?: StepArgSpec;
};

/** The buildable action vocabulary, in display order. */
export const STEP_PALETTE: PaletteEntry[] = [
  { nodeId: 'sit', name: 'Sit', icon: '🪑' },
  { nodeId: 'spin-cw', name: 'Spin', icon: '🌀' },
  { nodeId: 'bark', name: 'Bark', icon: '📣' },
  { nodeId: 'paw-up', name: 'Paw', icon: '🐾' },
  { nodeId: 'jump', name: 'Jump', icon: '🦘' },
  { nodeId: 'flip', name: 'Salto', icon: '🤸' },
  { nodeId: 'back-flip', name: 'Back-flip', icon: '🙃' },
  { nodeId: 'roll-over', name: 'Roll', icon: '🤾' },
  { nodeId: 'bow', name: 'Bow', icon: '🙇' },
  { nodeId: 'beg', name: 'Beg', icon: '🙏' },
  { nodeId: 'lie-down', name: 'Lie down', icon: '😴' },
  { nodeId: 'shake', name: 'Shake', icon: '💦' },
  { nodeId: 'head-tilt', name: 'Tilt', icon: '🤔' },
  {
    nodeId: 'walk-forward',
    name: 'Walk',
    icon: '🚶',
    arg: { key: 'distance', label: 'Distance', min: 0.2, max: 5, step: 0.2, default: 1, unit: 'm' },
  },
  {
    nodeId: 'pause',
    name: 'Wait',
    icon: '⏳',
    arg: { key: 'seconds', label: 'Seconds', min: 0.1, max: 5, step: 0.1, default: 1, unit: 's' },
  },
];

export function paletteEntry(nodeId: string): PaletteEntry | undefined {
  return STEP_PALETTE.find((p) => p.nodeId === nodeId);
}

export type Step = { nodeId: string; args: Record<string, number> };

export type TrickDraft = {
  name: string;
  cueGestureId?: 'clap' | 'whistle';
  repeat: number;
  steps: Step[];
};

export const MAX_STEPS = 24;
export const MAX_REPEAT = 20;

export function emptyDraft(): TrickDraft {
  return { name: '', repeat: 1, steps: [] };
}

export function makeStep(nodeId: string): Step {
  const entry = paletteEntry(nodeId);
  const args: Record<string, number> = {};
  if (entry?.arg) args[entry.arg.key] = entry.arg.default;
  return { nodeId, args };
}

export function clampRepeat(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_REPEAT, Math.floor(n)));
}

export function clampArg(entry: PaletteEntry, raw: number): number {
  if (!entry.arg) return raw;
  const v = Number.isFinite(raw) ? raw : entry.arg.default;
  return Math.max(entry.arg.min, Math.min(entry.arg.max, v));
}

/** Returns a human-readable error, or null when the draft is valid. */
export function validateDraft(draft: TrickDraft): string | null {
  if (!draft.name.trim()) return 'Give the trick a name';
  if (draft.steps.length === 0) return 'Add at least one step';
  if (draft.steps.length > MAX_STEPS) return `Too many steps (max ${MAX_STEPS})`;
  for (const s of draft.steps) {
    if (!paletteEntry(s.nodeId)) return `Unknown step: ${s.nodeId}`;
  }
  return null;
}

function stepProgram(step: Step): Program {
  const entry = paletteEntry(step.nodeId);
  if (entry?.arg) {
    const raw = step.args[entry.arg.key] ?? entry.arg.default;
    return { nodeId: step.nodeId, args: { [entry.arg.key]: clampArg(entry, raw) } };
  }
  return { nodeId: step.nodeId };
}

/** Lower a draft into an executable engine program. */
export function buildProgram(draft: TrickDraft): Program {
  const children = draft.steps.map(stepProgram);
  const body: Program = children.length === 1 ? children[0]! : { nodeId: 'seq', children };
  const repeat = clampRepeat(draft.repeat);
  if (repeat > 1) return { nodeId: 'repeat-n', args: { n: repeat }, children: [body] };
  return body;
}

export function draftToTrick(draft: TrickDraft, id?: string): Trick {
  const tid = id ?? `t-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  return newTrick({
    id: tid,
    name: draft.name.trim(),
    ...(draft.cueGestureId ? { cueGestureId: draft.cueGestureId } : {}),
    program: buildProgram(draft),
    authoredBy: 'player',
  });
}

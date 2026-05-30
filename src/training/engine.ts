import { emit } from '../core/bus';
import { runProgram } from './interpreter';
import { decayTrace, emptyAssoc, reinforce, attemptSucceeds, type Association } from './learning';
import type { NodeResult, Trick, WorldContext } from './types';

const HALF_LIFE_SEC = 45;
const REWARD_ALPHA = 0.18;
const MAX_LOG = 64;

type GestureEvent = { id: string; t: number };
type BehaviorEvent = { trickId: string; t: number; outcome: NodeResult };

export type TrainingEngine = {
  state: {
    vocabulary: Record<string, Record<string, Association>>;
    tricks: Record<string, Trick>;
    memory: Map<number, number>;
    gestures: GestureEvent[];
    behaviors: BehaviorEvent[];
  };
  registerTrick(trick: Trick): void;
  observeGesture(id: string): void;
  observeBehavior(trickId: string, outcome: NodeResult): void;
  recordReward(strength?: number): void;
  presentCue(gestureId: string, ctx: WorldContext): Promise<NodeResult>;
  runTrick(trickId: string, ctx: WorldContext): Promise<NodeResult>;
  abortCurrent(): void;
};

export function createTrainingEngine(rng: () => number = Math.random): TrainingEngine {
  const state = {
    vocabulary: {} as Record<string, Record<string, Association>>,
    tricks: {} as Record<string, Trick>,
    memory: new Map<number, number>(),
    gestures: [] as GestureEvent[],
    behaviors: [] as BehaviorEvent[],
  };
  let abortCtrl = new AbortController();

  const pruneLogs = (): void => {
    if (state.gestures.length > MAX_LOG) state.gestures.splice(0, state.gestures.length - MAX_LOG);
    if (state.behaviors.length > MAX_LOG) state.behaviors.splice(0, state.behaviors.length - MAX_LOG);
  };

  const ensureAssoc = (g: string, t: string): Association => {
    state.vocabulary[g] ??= {};
    const row = state.vocabulary[g]!;
    row[t] ??= emptyAssoc();
    return row[t]!;
  };

  const pickTrickForGesture = (gestureId: string): string | null => {
    const repertoire = Object.keys(state.tricks);
    if (repertoire.length === 0) return null;
    // Exploit: a learned cue tends to fire its strongest association — the
    // chance it actually does grows with how well-conditioned it is.
    const row = state.vocabulary[gestureId];
    if (row) {
      const learned = Object.entries(row)
        .filter(([id, a]) => a.strength > 0.05 && state.tricks[id])
        .sort(([, a], [, b]) => b.strength - a.strength)[0];
      if (learned && attemptSucceeds(learned[1].strength, rng)) return learned[0];
    }
    // Explore: an untrained — or unsure — dog just tries something from its
    // repertoire. This is the "random at first" reaction that reward shapes into
    // a habit; it never goes silent, so there's always a behaviour to reinforce.
    return repertoire[Math.floor(rng() * repertoire.length)] ?? null;
  };

  return {
    state,
    registerTrick: (trick) => {
      state.tricks[trick.id] = trick;
    },
    observeGesture: (id) => {
      state.gestures.push({ id, t: Date.now() });
      pruneLogs();
      emit('biome:enter', { biome: '' });
    },
    observeBehavior: (trickId, outcome) => {
      state.behaviors.push({ trickId, t: Date.now(), outcome });
      pruneLogs();
    },
    recordReward: (strength = 1.0) => {
      const now = Date.now();
      const recentGestures = state.gestures.filter((g) => (now - g.t) / 1000 < HALF_LIFE_SEC * 4);
      const recentBehaviors = state.behaviors.filter((b) => (now - b.t) / 1000 < HALF_LIFE_SEC * 4);
      for (const g of recentGestures) {
        for (const b of recentBehaviors) {
          if (!b.outcome.success) continue;
          const gTrace = decayTrace(1, (now - g.t) / 1000, HALF_LIFE_SEC);
          const bTrace = decayTrace(1, (now - b.t) / 1000, HALF_LIFE_SEC);
          const traceProduct = gTrace * bTrace;
          const assoc = ensureAssoc(g.id, b.trickId);
          const updated = reinforce(assoc, traceProduct, strength, now, REWARD_ALPHA);
          state.vocabulary[g.id]![b.trickId] = updated;
          const trick = state.tricks[b.trickId];
          if (trick) {
            trick.reinforcements += 1;
            trick.mastery = Math.max(trick.mastery, updated.strength);
          }
        }
      }
    },
    presentCue: async (gestureId, ctx) => {
      state.gestures.push({ id: gestureId, t: Date.now() });
      pruneLogs();
      const trickId = pickTrickForGesture(gestureId);
      if (!trickId) return { success: false };
      return await runTrickInternal(trickId, ctx);
    },
    runTrick: (trickId, ctx) => runTrickInternal(trickId, ctx),
    abortCurrent: () => {
      abortCtrl.abort();
      abortCtrl = new AbortController();
    },
  };

  async function runTrickInternal(trickId: string, ctx: WorldContext): Promise<NodeResult> {
    const trick = state.tricks[trickId];
    if (!trick) return { success: false };
    trick.attempts += 1;
    const result = await runProgram(trick.program, ctx, state.memory, abortCtrl.signal);
    if (result.success) trick.successes += 1;
    state.behaviors.push({ trickId, t: Date.now(), outcome: result });
    pruneLogs();
    return result;
  }
}

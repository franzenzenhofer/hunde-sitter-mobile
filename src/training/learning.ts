export type Association = {
  strength: number;
  reinforcements: number;
  lastReinforcedAt: number;
};

const DEFAULT_ALPHA = 0.18;
const DEFAULT_HALFLIFE_SEC = 45;
const BASE_PROB = 0.1;

export function emptyAssoc(): Association {
  return { strength: 0, reinforcements: 0, lastReinforcedAt: 0 };
}

export function decayTrace(traceValue: number, dtSec: number, halfLifeSec = DEFAULT_HALFLIFE_SEC): number {
  if (dtSec <= 0) return traceValue;
  const lambda = Math.LN2 / halfLifeSec;
  return traceValue * Math.exp(-lambda * dtSec);
}

export function traceAt(elapsedSec: number, halfLifeSec = DEFAULT_HALFLIFE_SEC): number {
  return decayTrace(1, elapsedSec, halfLifeSec);
}

export function reinforce(
  assoc: Association,
  traceValue: number,
  strength: number,
  now: number,
  alpha = DEFAULT_ALPHA,
): Association {
  const delta = alpha * (1 - assoc.strength) * traceValue * Math.max(0, Math.min(1, strength));
  return {
    strength: Math.max(0, Math.min(1, assoc.strength + delta)),
    reinforcements: assoc.reinforcements + (delta > 0 ? 1 : 0),
    lastReinforcedAt: delta > 0 ? now : assoc.lastReinforcedAt,
  };
}

export function probSuccess(strength: number, baseProb = BASE_PROB): number {
  const clamped = Math.max(0, Math.min(1, strength));
  return baseProb + (1 - baseProb) * clamped;
}

export function attemptSucceeds(strength: number, rng: () => number, baseProb = BASE_PROB): boolean {
  return rng() < probSuccess(strength, baseProb);
}

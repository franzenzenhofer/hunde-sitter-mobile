import { describe, it, expect } from 'vitest';
import {
  decayTrace,
  emptyAssoc,
  reinforce,
  probSuccess,
  traceAt,
} from '../../src/training/learning';

describe('learning - trace decay', () => {
  it('trace at half-life is approximately 0.5', () => {
    expect(traceAt(45)).toBeCloseTo(0.5, 2);
  });

  it('trace at two half-lives is approximately 0.25', () => {
    expect(traceAt(90)).toBeCloseTo(0.25, 2);
  });

  it('trace at 0 seconds is 1', () => {
    expect(traceAt(0)).toBe(1);
  });

  it('decayTrace is multiplicative', () => {
    const v = decayTrace(1, 30);
    expect(decayTrace(v, 30)).toBeCloseTo(decayTrace(1, 60), 3);
  });
});

describe('learning - reinforcement (Rescorla-Wagner)', () => {
  it('first reinforcement at full trace lifts strength by alpha', () => {
    const a = reinforce(emptyAssoc(), 1, 1, 0, 0.18);
    expect(a.strength).toBeCloseTo(0.18, 3);
  });

  it('repeated reinforcement asymptotes toward 1 with diminishing deltas', () => {
    let a = emptyAssoc();
    for (let i = 0; i < 30; i++) a = reinforce(a, 1, 1, i, 0.18);
    expect(a.strength).toBeGreaterThan(0.95);
    const oneMore = reinforce(a, 1, 1, 30, 0.18);
    expect(oneMore.strength - a.strength).toBeLessThan(0.01);
  });

  it('low trace value yields a smaller update', () => {
    const full = reinforce(emptyAssoc(), 1, 1, 0, 0.18);
    const half = reinforce(emptyAssoc(), 0.5, 1, 0, 0.18);
    expect(half.strength).toBeCloseTo(full.strength * 0.5, 3);
  });

  it('strength is bounded in [0,1]', () => {
    const a = reinforce(emptyAssoc(), 1, 5, 0, 0.18);
    expect(a.strength).toBeLessThanOrEqual(1);
  });

  it('reward 60s after behavior still applies, but less', () => {
    const fresh = reinforce(emptyAssoc(), traceAt(0), 1, 0, 0.18);
    const late = reinforce(emptyAssoc(), traceAt(60), 1, 60_000, 0.18);
    expect(late.strength).toBeGreaterThan(0);
    expect(late.strength).toBeLessThan(fresh.strength);
  });
});

describe('learning - success probability', () => {
  it('zero strength yields baseProb', () => {
    expect(probSuccess(0)).toBeCloseTo(0.1, 5);
  });

  it('full strength yields 1.0', () => {
    expect(probSuccess(1)).toBeCloseTo(1, 5);
  });

  it('halfway strength is between base and 1', () => {
    const p = probSuccess(0.5);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThan(1);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ExecutionContext, WorldContext, Primitive } from '../../src/training/types';
import jump from '../../src/training/nodes/actions/jump';
import flip from '../../src/training/nodes/actions/flip';
import backFlip from '../../src/training/nodes/actions/back-flip';
import rollOver from '../../src/training/nodes/actions/roll-over';
import bow from '../../src/training/nodes/actions/bow';
import beg from '../../src/training/nodes/actions/beg';
import lieDown from '../../src/training/nodes/actions/lie-down';
import shake from '../../src/training/nodes/actions/shake';
import headTilt from '../../src/training/nodes/actions/head-tilt';

const BODY_BASE_Y = 0.45;

function fakeDog() {
  const v = () => ({ x: 0, y: 0, z: 0 });
  const group = { position: v(), rotation: v() };
  const body = { position: { x: 0, y: BODY_BASE_Y, z: 0 }, rotation: v() };
  const head = { position: { x: 0, y: 0.7, z: 0.5 }, rotation: v() };
  const mesh = { group, body, head, tail: { position: v(), rotation: v() }, legs: [] };
  return { group, mesh };
}

type Dog = ReturnType<typeof fakeDog>;

function ec(dog: Dog): ExecutionContext {
  return {
    ctx: { dog } as unknown as WorldContext,
    memory: new Map(),
    args: {},
    childCount: 0,
    evalChild: async () => null,
    abort: new AbortController().signal,
  };
}

/** Run a primitive to completion, flushing the faked rAF/sleep timers. */
async function run(p: Primitive, dog: Dog) {
  const pending = p.execute(ec(dog));
  await vi.runAllTimersAsync();
  return pending;
}

let clock = 0;
beforeEach(() => {
  vi.useFakeTimers();
  clock = 0;
  // rAF as a 0ms timer; a fast-forwarding clock so every tween settles in one frame.
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => setTimeout(() => cb(clock), 0));
  vi.spyOn(performance, 'now').mockImplementation(() => (clock += 50_000));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('motor primitives settle the dog back to a clean resting pose', () => {
  it('jump returns the body to its base height', async () => {
    const dog = fakeDog();
    expect((await run(jump, dog)).success).toBe(true);
    expect(dog.mesh.body.position.y).toBeCloseTo(BODY_BASE_Y, 5);
  });

  it('flip (salto) unwinds the pitch and lands flat', async () => {
    const dog = fakeDog();
    expect((await run(flip, dog)).success).toBe(true);
    expect(dog.group.rotation.x).toBe(0);
    expect(dog.mesh.body.position.y).toBeCloseTo(BODY_BASE_Y, 5);
  });

  it('back-flip unwinds the pitch and lands flat', async () => {
    const dog = fakeDog();
    expect((await run(backFlip, dog)).success).toBe(true);
    expect(dog.group.rotation.x).toBe(0);
    expect(dog.mesh.body.position.y).toBeCloseTo(BODY_BASE_Y, 5);
  });

  it('roll-over unwinds the roll axis', async () => {
    const dog = fakeDog();
    expect((await run(rollOver, dog)).success).toBe(true);
    expect(dog.group.rotation.z).toBe(0);
  });

  it('bow returns the body pitch to flat', async () => {
    const dog = fakeDog();
    expect((await run(bow, dog)).success).toBe(true);
    expect(dog.mesh.body.rotation.x).toBeCloseTo(0, 5);
  });

  it('beg returns the body pitch to flat', async () => {
    const dog = fakeDog();
    expect((await run(beg, dog)).success).toBe(true);
    expect(dog.mesh.body.rotation.x).toBeCloseTo(0, 5);
  });

  it('lie-down gets back up to base height', async () => {
    const dog = fakeDog();
    expect((await run(lieDown, dog)).success).toBe(true);
    expect(dog.mesh.body.position.y).toBeCloseTo(BODY_BASE_Y, 5);
  });

  it('shake returns the body roll to flat', async () => {
    const dog = fakeDog();
    expect((await run(shake, dog)).success).toBe(true);
    expect(dog.mesh.body.rotation.z).toBeCloseTo(0, 5);
  });

  it('head-tilt returns the head to centre', async () => {
    const dog = fakeDog();
    expect((await run(headTilt, dog)).success).toBe(true);
    expect(dog.mesh.head.rotation.z).toBeCloseTo(0, 5);
  });
});

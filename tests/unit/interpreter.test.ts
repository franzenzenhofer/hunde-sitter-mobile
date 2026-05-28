import { describe, it, expect, beforeAll } from 'vitest';
import { runProgram } from '../../src/training/interpreter';
import { allPrimitives, getPrimitive, registerPrimitive } from '../../src/training/registry';
import type { Primitive, Program, WorldContext } from '../../src/training/types';

// Headless world context for tests (no Three.js mesh needed for control/memory/sense logic)
const stubCtx: WorldContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dog: { group: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } }, mesh: { body: { position: { y: 0 }, rotation: { x: 0 } }, head: { position: { y: 1 }, rotation: { x: 0 } }, legs: [] } } as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  player: { group: { position: { x: 0, y: 0, z: 0 } } } as any,
  ballVisible: () => false,
  recentGestures: () => [],
  recentBehaviors: () => [],
  now: () => Date.now(),
};

beforeAll(() => {
  if (getPrimitive('const')) return;
  // Load all node files explicitly via static imports for vitest (no Vite glob in tests).
  const mods: Array<{ default: Primitive }> = [];
  for (const m of Object.values(
    import.meta.glob('../../src/training/nodes/**/*.ts', { eager: true }) as Record<string, { default: Primitive }>,
  )) {
    mods.push(m);
  }
  for (const m of mods) registerPrimitive(m.default);
});

describe('interpreter - basic', () => {
  it('registry loaded primitives', () => {
    expect(allPrimitives().length).toBeGreaterThan(10);
  });

  it('const returns its value', async () => {
    const p: Program = { nodeId: 'const', args: { value: 42 } };
    const r = await runProgram(p, stubCtx, new Map(), new AbortController().signal);
    expect(r.value).toBe(42);
  });

  it('seq runs children left-to-right and reports success', async () => {
    const memory = new Map<number, number>();
    const p: Program = {
      nodeId: 'seq',
      children: [
        { nodeId: 'cell-inc', args: { cellId: 0 } },
        { nodeId: 'cell-inc', args: { cellId: 0 } },
        { nodeId: 'cell-inc', args: { cellId: 0 } },
      ],
    };
    const r = await runProgram(p, stubCtx, memory, new AbortController().signal);
    expect(r.success).toBe(true);
    expect(memory.get(0)).toBe(3);
  });

  it('if picks branch based on cond value', async () => {
    const truthy: Program = {
      nodeId: 'if',
      children: [
        { nodeId: 'const', args: { value: 1 } },
        { nodeId: 'const', args: { value: 99 } },
        { nodeId: 'const', args: { value: 7 } },
      ],
    };
    const falsy: Program = {
      ...truthy,
      children: [
        { nodeId: 'const', args: { value: 0 } },
        { nodeId: 'const', args: { value: 99 } },
        { nodeId: 'const', args: { value: 7 } },
      ],
    };
    const rt = await runProgram(truthy, stubCtx, new Map(), new AbortController().signal);
    const rf = await runProgram(falsy, stubCtx, new Map(), new AbortController().signal);
    expect(rt.value).toBe(99);
    expect(rf.value).toBe(7);
  });

  it('while counts up to N (Turing-complete primitive)', async () => {
    const memory = new Map<number, number>();
    const N = 5;
    const counter: Program = {
      nodeId: 'while',
      children: [
        { nodeId: 'cell-lt', args: { cellId: 0, value: N } },
        { nodeId: 'cell-inc', args: { cellId: 0 } },
      ],
    };
    const r = await runProgram(counter, stubCtx, memory, new AbortController().signal);
    expect(r.success).toBe(true);
    expect(memory.get(0)).toBe(N);
  });

  it('repeat-n runs child N times', async () => {
    const memory = new Map<number, number>();
    const p: Program = {
      nodeId: 'repeat-n',
      args: { n: 4 },
      children: [{ nodeId: 'cell-inc', args: { cellId: 1 } }],
    };
    await runProgram(p, stubCtx, memory, new AbortController().signal);
    expect(memory.get(1)).toBe(4);
  });

  it('arithmetic via add/sub/mul', async () => {
    const expr: Program = {
      nodeId: 'add',
      children: [
        { nodeId: 'mul', children: [{ nodeId: 'const', args: { value: 6 } }, { nodeId: 'const', args: { value: 7 } }] },
        { nodeId: 'sub', children: [{ nodeId: 'const', args: { value: 10 } }, { nodeId: 'const', args: { value: 3 } }] },
      ],
    };
    const r = await runProgram(expr, stubCtx, new Map(), new AbortController().signal);
    expect(r.value).toBe(49);
  });
});

describe('interpreter - Turing-completeness', () => {
  it('computes 2^N via nested while loops', async () => {
    // result = 2^exponent
    // cell0 = result, cell1 = i, cell2 = exponent
    const memory = new Map<number, number>([[0, 1]]);
    const exponent = 5;
    memory.set(2, exponent);
    const program: Program = {
      nodeId: 'while',
      children: [
        { nodeId: 'cell-lt', args: { cellId: 1, value: exponent } },
        {
          nodeId: 'seq',
          children: [
            // cell0 *= 2  via cell-set(cell0, mul(cell-get(0), const(2)))
            {
              nodeId: 'cell-set',
              args: { cellId: 0 },
              children: [
                {
                  nodeId: 'mul',
                  children: [
                    { nodeId: 'cell-get', args: { cellId: 0 } },
                    { nodeId: 'const', args: { value: 2 } },
                  ],
                },
              ],
            },
            { nodeId: 'cell-inc', args: { cellId: 1 } },
          ],
        },
      ],
    };
    await runProgram(program, stubCtx, memory, new AbortController().signal);
    expect(memory.get(0)).toBe(Math.pow(2, exponent));
  });
});

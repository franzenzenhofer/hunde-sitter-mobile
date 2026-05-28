import { getPrimitive } from './registry';
import type { ExecutionContext, NodeResult, Program, WorldContext } from './types';

const MAX_DEPTH = 64;

export async function runProgram(
  program: Program,
  ctx: WorldContext,
  memory: Map<number, number>,
  abort: AbortSignal,
  depth = 0,
): Promise<NodeResult> {
  if (depth > MAX_DEPTH) return { success: false };
  if (abort.aborted) return { success: false };
  const prim = getPrimitive(program.nodeId);
  if (!prim) return { success: false };

  const children = program.children ?? [];
  const args = { ...(prim.defaultArgs ?? {}), ...(program.args ?? {}) };

  const ec: ExecutionContext = {
    ctx,
    memory,
    args,
    childCount: children.length,
    abort,
    evalChild: async (i) => {
      const child = children[i];
      if (!child) return null;
      return runProgram(child, ctx, memory, abort, depth + 1);
    },
  };

  try {
    return await prim.execute(ec);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return { success: false };
    console.error('[interpreter] node failed', prim.id, err);
    return { success: false };
  }
}

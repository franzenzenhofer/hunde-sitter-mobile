import type { Program, Trick } from './types';

export type NewTrickInput = {
  id: string;
  name: string;
  program: Program;
  cueGestureId?: string;
  authoredBy?: 'system' | 'player';
  createdAt?: number;
};

/**
 * Build a {@link Trick} with the standard zeroed learning stats. Keeps trick
 * construction DRY across seed tricks, the composer and the test hooks.
 */
export function newTrick(input: NewTrickInput): Trick {
  return {
    id: input.id,
    name: input.name,
    ...(input.cueGestureId ? { cueGestureId: input.cueGestureId } : {}),
    program: input.program,
    mastery: 0,
    attempts: 0,
    successes: 0,
    reinforcements: 0,
    authoredBy: input.authoredBy ?? 'system',
    createdAt: input.createdAt ?? Date.now(),
  };
}

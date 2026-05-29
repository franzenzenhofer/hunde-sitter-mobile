import type { Trick } from './types';
import { newTrick } from './trick';

export function seedTricks(): Record<string, Trick> {
  return {
    sit: newTrick({ id: 'sit', name: 'Sit', program: { nodeId: 'sit' } }),
    bark: newTrick({ id: 'bark', name: 'Bark', program: { nodeId: 'bark' } }),
    spin: newTrick({ id: 'spin', name: 'Spin', program: { nodeId: 'spin-cw' } }),
    pawup: newTrick({ id: 'pawup', name: 'Paw', program: { nodeId: 'paw-up' } }),
  };
}

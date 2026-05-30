import type { Trick } from './types';
import { newTrick } from './trick';

export function seedTricks(): Record<string, Trick> {
  return {
    sit: newTrick({ id: 'sit', name: 'Sit', program: { nodeId: 'sit' } }),
    bark: newTrick({ id: 'bark', name: 'Bark', program: { nodeId: 'bark' } }),
    spin: newTrick({ id: 'spin', name: 'Spin', program: { nodeId: 'spin-cw' } }),
    pawup: newTrick({ id: 'pawup', name: 'Paw', program: { nodeId: 'paw-up' } }),
    // A ready-made acrobatic trick so the salto — and the whole compose-a-trick
    // idea — is discoverable from the very first session. Players can open it in
    // Teach to see how it's built, then author their own.
    salto: newTrick({ id: 'salto', name: 'Salto', program: { nodeId: 'flip' } }),
  };
}

import type { Trick } from './types';

const now = (): number => Date.now();

export function seedTricks(): Record<string, Trick> {
  return {
    sit: {
      id: 'sit',
      name: 'Sit',
      program: { nodeId: 'sit' },
      mastery: 0,
      attempts: 0,
      successes: 0,
      reinforcements: 0,
      authoredBy: 'system',
      createdAt: now(),
    },
    bark: {
      id: 'bark',
      name: 'Bark',
      program: { nodeId: 'bark' },
      mastery: 0,
      attempts: 0,
      successes: 0,
      reinforcements: 0,
      authoredBy: 'system',
      createdAt: now(),
    },
    spin: {
      id: 'spin',
      name: 'Spin',
      program: { nodeId: 'spin-cw' },
      mastery: 0,
      attempts: 0,
      successes: 0,
      reinforcements: 0,
      authoredBy: 'system',
      createdAt: now(),
    },
    pawup: {
      id: 'pawup',
      name: 'Paw',
      program: { nodeId: 'paw-up' },
      mastery: 0,
      attempts: 0,
      successes: 0,
      reinforcements: 0,
      authoredBy: 'system',
      createdAt: now(),
    },
  };
}

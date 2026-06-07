import type { Program, Trick } from './types';
import { newTrick } from './trick';

/**
 * Bello's behaviour repertoire - the things his body knows how to do. These are
 * NOT human buttons: the human never picks a behaviour directly. The dog's AI
 * brain chooses one of these in response to a cue (or on its own), and the
 * trainer rewards what they like. The full motor range plus a set of combos is
 * here so the brain has a rich menu to be creative with.
 */
export function seedTricks(): Record<string, Trick> {
  const t = (id: string, name: string, nodeId: string): Trick =>
    newTrick({ id, name, program: { nodeId } });
  const seq = (...nodeIds: string[]): Program => ({
    nodeId: 'seq',
    children: nodeIds.map((nodeId) => ({ nodeId })),
  });
  const combo = (id: string, name: string, ...nodeIds: string[]): Trick =>
    newTrick({ id, name, program: seq(...nodeIds) });
  const list = [
    // Single motor primitives.
    t('sit', 'Sit', 'sit'),
    t('lie-down', 'Lie down', 'lie-down'),
    t('bark', 'Bark', 'bark'),
    t('spin', 'Spin', 'spin-cw'),
    t('pawup', 'Paw', 'paw-up'),
    t('shake', 'Shake', 'shake'),
    t('bow', 'Bow', 'bow'),
    t('beg', 'Beg', 'beg'),
    t('head-tilt', 'Head tilt', 'head-tilt'),
    t('jump', 'Jump', 'jump'),
    t('roll-over', 'Roll over', 'roll-over'),
    t('salto', 'Salto', 'flip'),
    t('back-flip', 'Back-flip', 'back-flip'),
    // Combos - richer "tricks" the brain can pick, built from the primitives.
    combo('dance', 'Dance', 'spin-cw', 'bow', 'spin-cw'),
    combo('show-off', 'Show off', 'beg', 'shake', 'bark'),
    combo('greet', 'Greet', 'bow', 'paw-up'),
    combo('tumble', 'Tumble', 'roll-over', 'jump'),
    combo('peekaboo', 'Peekaboo', 'lie-down', 'head-tilt', 'sit'),
    combo('grand-finale', 'Grand finale', 'flip', 'spin-cw', 'beg'),
  ];
  return Object.fromEntries(list.map((trick) => [trick.id, trick]));
}

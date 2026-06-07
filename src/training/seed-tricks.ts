import type { Trick } from './types';
import { newTrick } from './trick';

/**
 * Bello's innate behaviour repertoire - the things his body already knows how
 * to do. These are NOT human buttons: the human never picks a behaviour
 * directly. When the human cues (clap, whistle, ...) the dog's AI chooses one
 * of these to offer, random at first; rewarding what you like conditions the
 * cue to that behaviour over time. The full motor range is here so any of it
 * can be trained onto any cue.
 */
export function seedTricks(): Record<string, Trick> {
  const t = (id: string, name: string, nodeId: string): Trick =>
    newTrick({ id, name, program: { nodeId } });
  const list = [
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
  ];
  return Object.fromEntries(list.map((trick) => [trick.id, trick]));
}

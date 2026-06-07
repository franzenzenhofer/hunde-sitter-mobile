/**
 * Everything the HUMAN can do - and nothing the dog does. This is a dog-
 * training simulator: you never press "sit". You give Bello cues and rewards,
 * and his internal AI decides what to do and learns from how you reward it.
 *
 * Two kinds of human action:
 *   cue    - a signal the dog can learn to read (clap, whistle, point, snap).
 *            Each cue makes the dog offer a behaviour; reward shapes which one.
 *   reward - reinforce what just happened (Good!, Treat, Pet). Plus Throw for
 *            play. The cue -> behaviour -> reward loop is the whole game.
 */
import { Command, CommandRegistry } from './command';

/** The cue signals the human can give. Each is a distinct stimulus to condition. */
export const CUES = ['clap', 'whistle', 'point', 'snap'] as const;
export type CueId = (typeof CUES)[number];

/** Everything the live game must expose for human commands to act on. */
export type GameActionContext = {
  /** Player is carrying at least one ball. */
  hasBall: boolean;
  /** Player is carrying at least one treat. */
  hasTreat: boolean;
  /** A ball is already out in the world (can't throw a second). */
  ballInPlay: boolean;
  /** Player is close enough to touch the dog. */
  dogNear: boolean;

  pet(): void;
  feed(): void;
  throwBall(): void;
  reward(strength: number): void;
  cue(id: CueId): void;
};

export type GameCommand = Command<GameActionContext>;
export type GameRegistry = CommandRegistry<GameActionContext>;

/** Glyph shown for each cue, mirrored by the vocabulary panel. */
export const CUE_ICON: Record<CueId, string> = {
  clap: '👏',
  whistle: '😙',
  point: '👉',
  snap: '🫰',
};

const CUE_HINT: Record<CueId, string> = {
  clap: 'Clap - a signal Bello can learn to read',
  whistle: 'Whistle - a second signal to tell apart',
  point: 'Point - a hand signal to condition',
  snap: 'Snap - one more cue to train',
};

/**
 * The human action deck. Cues make the dog offer a behaviour; rewards reinforce
 * it. The dock renders whatever is here, so the player's whole range is always
 * on screen, lit when usable and dimmed when not.
 */
export function createGameCommands(): GameCommand[] {
  const cueCommands = CUES.map(
    (id) =>
      new Command<GameActionContext>({
        id,
        label: id[0]!.toUpperCase() + id.slice(1),
        icon: CUE_ICON[id],
        group: 'cue',
        hint: CUE_HINT[id],
        cooldown: 350,
        execute: (ctx) => ctx.cue(id),
      }),
  );
  return [
    ...cueCommands,
    new Command<GameActionContext>({
      id: 'reward',
      label: 'Good!',
      icon: '👍',
      group: 'reward',
      hint: 'Reward the last cue + behaviour so Bello learns it',
      cooldown: 250,
      execute: (ctx) => ctx.reward(1),
    }),
    new Command<GameActionContext>({
      id: 'feed',
      label: 'Treat',
      icon: '🍖',
      group: 'reward',
      hint: 'Feed a treat - a strong reward (needs a treat, stay close)',
      cooldown: 400,
      canExecute: (ctx) => ctx.hasTreat && ctx.dogNear,
      execute: (ctx) => ctx.feed(),
    }),
    new Command<GameActionContext>({
      id: 'pet',
      label: 'Pet',
      icon: '❤️',
      group: 'reward',
      hint: 'Pet Bello - a gentle reward (stay close)',
      cooldown: 600,
      canExecute: (ctx) => ctx.dogNear,
      execute: (ctx) => ctx.pet(),
    }),
    new Command<GameActionContext>({
      id: 'throw',
      label: 'Throw',
      icon: '🎾',
      group: 'play',
      hint: 'Throw the ball - Bello fetches it',
      canExecute: (ctx) => ctx.hasBall && !ctx.ballInPlay,
      execute: (ctx) => ctx.throwBall(),
    }),
  ];
}

export function createGameRegistry(): GameRegistry {
  return new CommandRegistry<GameActionContext>(createGameCommands());
}

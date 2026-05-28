/**
 * The repertoire of things the dog-sitter can do, expressed declaratively on
 * top of {@link Command}. Each command only knows *whether* it is valid right
 * now (canExecute) and *what* it does to the game context (execute) — the dock
 * renders whatever is here, so growing the game is just adding a Command.
 *
 * Three groups map to the premise of a programmable dog simulator:
 *   care  — keep Bello happy   (Pet, Feed)
 *   play  — physical play       (Throw)
 *   train — the programmable core: cues, reward, and performing tricks. This is
 *           the operant-conditioning loop — Cue → Trick → Reward builds the
 *           dog's vocabulary until a cue alone triggers the behaviour.
 */
import { Command, CommandRegistry } from './command';

/** Everything the live game must expose for commands to act on. */
export type GameActionContext = {
  /** Player is carrying at least one ball. */
  hasBall: boolean;
  /** Player is carrying at least one treat. */
  hasTreat: boolean;
  /** A ball is already out in the world (can't throw a second). */
  ballInPlay: boolean;
  /** Player is close enough to touch the dog. */
  dogNear: boolean;
  /** A trick animation is currently playing (blocks overlapping tricks). */
  busy: boolean;

  pet(): void;
  feed(): void;
  throwBall(): void;
  reward(strength: number): void;
  cue(id: 'clap' | 'whistle'): void;
  performTrick(id: string): void;
};

export type GameCommand = Command<GameActionContext>;
export type GameRegistry = CommandRegistry<GameActionContext>;

/** Default glyphs for the seed tricks; authored tricks can supply their own. */
export const TRICK_ICONS: Record<string, string> = {
  sit: '🪑',
  bark: '📣',
  spin: '🌀',
  pawup: '🐾',
};

export function trickIcon(id: string): string {
  return TRICK_ICONS[id] ?? '✨';
}

/**
 * The static commands. Tricks are created dynamically from the engine's known
 * tricks via {@link makeTrickCommand} so newly-authored tricks appear for free.
 */
export function createGameCommands(): GameCommand[] {
  return [
    new Command<GameActionContext>({
      id: 'pet',
      label: 'Pet',
      icon: '❤️',
      group: 'care',
      hint: 'Give Bello some love',
      cooldown: 600,
      canExecute: (ctx) => ctx.dogNear,
      execute: (ctx) => ctx.pet(),
    }),
    new Command<GameActionContext>({
      id: 'feed',
      label: 'Feed',
      icon: '🍖',
      group: 'care',
      hint: 'Feed a treat — fills hunger',
      cooldown: 400,
      canExecute: (ctx) => ctx.hasTreat && ctx.dogNear,
      execute: (ctx) => ctx.feed(),
    }),
    new Command<GameActionContext>({
      id: 'throw',
      label: 'Throw',
      icon: '🎾',
      group: 'play',
      hint: 'Throw the ball — Bello fetches it',
      canExecute: (ctx) => ctx.hasBall && !ctx.ballInPlay,
      execute: (ctx) => ctx.throwBall(),
    }),
    new Command<GameActionContext>({
      id: 'clap',
      label: 'Clap',
      icon: '👏',
      group: 'train',
      hint: 'A cue — pair it with a trick, then reward',
      cooldown: 400,
      execute: (ctx) => ctx.cue('clap'),
    }),
    new Command<GameActionContext>({
      id: 'whistle',
      label: 'Whistle',
      icon: '😙',
      group: 'train',
      hint: 'A second cue — teach Bello to tell them apart',
      cooldown: 600,
      execute: (ctx) => ctx.cue('whistle'),
    }),
    new Command<GameActionContext>({
      id: 'reward',
      label: 'Good!',
      icon: '👍',
      group: 'train',
      hint: 'Reward the last cue + behaviour to build vocabulary',
      cooldown: 250,
      execute: (ctx) => ctx.reward(1),
    }),
  ];
}

/** Build a command that performs a known trick (Sit, Spin, …) on tap. */
export function makeTrickCommand(trick: { id: string; name: string }): GameCommand {
  return new Command<GameActionContext>({
    id: `trick:${trick.id}`,
    label: trick.name,
    icon: trickIcon(trick.id),
    group: 'train',
    hint: `Ask Bello to ${trick.name.toLowerCase()}`,
    cooldown: 300,
    canExecute: (ctx) => !ctx.busy,
    execute: (ctx) => ctx.performTrick(trick.id),
  });
}

export function createGameRegistry(): GameRegistry {
  return new CommandRegistry<GameActionContext>(createGameCommands());
}

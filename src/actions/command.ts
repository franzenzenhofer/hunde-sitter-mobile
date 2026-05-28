/**
 * A Command is one thing the player can ask of Bello.
 *
 * It is intentionally just data + a couple of small functions so the whole
 * action system stays declarative: to grow the game's "full potential" you
 * register a new Command and the UI, availability logic and cooldowns all
 * come for free. The action dock is then a pure function of
 * (registry, context): render every command, enable the ones that canExecute.
 *
 *   - canExecute(ctx, now): is this action valid right now? (drives enabled state)
 *   - execute(ctx, target):  perform it against the live game context
 *
 * `target` is a world-space point for aimed commands (e.g. a future tap-to-throw)
 * and `null` for instant commands (Pet, Sit, Reward…). Instant commands ignore it.
 */

export type TapTarget = { x: number; z: number };

/** Buckets the dock groups commands under. Order here is display order. */
export type CommandGroup = 'care' | 'play' | 'train';

export type CommandSpec<Ctx> = {
  id: string;
  label: string;
  icon: string;
  group: CommandGroup;
  hint?: string;
  /** True => the command wants a tapped field location before it fires. */
  target?: boolean;
  /** Minimum milliseconds between uses (0 = always ready). */
  cooldown?: number;
  /** Optional predicate; absent means "always valid" (modulo cooldown). */
  canExecute?: (ctx: Ctx) => boolean;
  execute: (ctx: Ctx, target: TapTarget | null) => void;
};

export class Command<Ctx> {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly group: CommandGroup;
  readonly hint: string;
  readonly target: boolean;
  readonly cooldown: number;
  private readonly predicate: ((ctx: Ctx) => boolean) | null;
  private readonly run: (ctx: Ctx, target: TapTarget | null) => void;
  lastUsedAt = -Infinity;

  constructor(spec: CommandSpec<Ctx>) {
    if (!spec.id) throw new Error('Command requires an id');
    if (typeof spec.execute !== 'function') {
      throw new Error(`Command "${spec.id}" requires an execute function`);
    }
    this.id = spec.id;
    this.label = spec.label;
    this.icon = spec.icon;
    this.group = spec.group;
    this.hint = spec.hint ?? '';
    this.target = spec.target ?? false;
    this.cooldown = spec.cooldown ?? 0;
    this.predicate = spec.canExecute ?? null;
    this.run = spec.execute;
  }

  /** True once enough time has passed since the last use. */
  isReady(now = 0): boolean {
    return now - this.lastUsedAt >= this.cooldown;
  }

  /** Milliseconds left on cooldown (0 when ready) — useful for UI feedback. */
  cooldownRemaining(now = 0): number {
    return Math.max(0, this.cooldown - (now - this.lastUsedAt));
  }

  /** 0..1 progress through the current cooldown (1 = ready). */
  cooldownProgress(now = 0): number {
    if (this.cooldown <= 0) return 1;
    return Math.min(1, (now - this.lastUsedAt) / this.cooldown);
  }

  /** Whether the action is valid right now (predicate AND off cooldown). */
  canExecute(ctx: Ctx, now = 0): boolean {
    if (!this.isReady(now)) return false;
    return this.predicate ? this.predicate(ctx) : true;
  }

  /**
   * Run the command. Returns true if it fired, false if it was blocked
   * (failed canExecute). A successful run stamps the cooldown.
   */
  execute(ctx: Ctx, target: TapTarget | null = null, now = 0): boolean {
    if (!this.canExecute(ctx, now)) return false;
    this.run(ctx, target);
    this.lastUsedAt = now;
    return true;
  }
}

/**
 * Holds every Command the game knows about and answers the two questions the
 * UI cares about: "what exists?" and "what is valid right now?".
 */
export class CommandRegistry<Ctx> {
  private readonly list: Command<Ctx>[] = [];
  private readonly byId = new Map<string, Command<Ctx>>();

  constructor(commands: Command<Ctx>[] = []) {
    for (const c of commands) this.register(c);
  }

  register(command: Command<Ctx>): this {
    if (this.byId.has(command.id)) {
      throw new Error(`Duplicate command id: ${command.id}`);
    }
    this.list.push(command);
    this.byId.set(command.id, command);
    return this;
  }

  get(id: string): Command<Ctx> | null {
    return this.byId.get(id) ?? null;
  }

  all(): Command<Ctx>[] {
    return this.list;
  }

  /** Commands in a single group, in registration order. */
  group(group: CommandGroup): Command<Ctx>[] {
    return this.list.filter((c) => c.group === group);
  }

  /** The subset of commands valid for the given context right now. */
  available(ctx: Ctx, now = 0): Command<Ctx>[] {
    return this.list.filter((c) => c.canExecute(ctx, now));
  }

  /** Execute by id. Throws on unknown id; returns the command's run result. */
  execute(id: string, ctx: Ctx, target: TapTarget | null = null, now = 0): boolean {
    const command = this.get(id);
    if (!command) throw new Error(`Unknown command id: ${id}`);
    return command.execute(ctx, target, now);
  }
}

/**
 * Bello's mind. The LLM ({@link LlmEngine}) is the dog; this module gives it a
 * body of context: a persona, the world situation, and a rolling memory of what
 * happened and how the trainer reacted. That memory IS the learning - past
 * cue -> action -> reward episodes are fed back as context, so over a session
 * Bello starts repeating what got rewarded and avoiding what didn't.
 *
 * Pure and engine-agnostic: it depends only on the LlmEngine contract, so it is
 * unit-tested with a fake model. No timers, no DOM, no three.js.
 */
import type { LlmEngine, LlmChoice } from './llm';

export type ActionDef = { id: string; name: string };

export type Situation = {
  ballVisible: boolean;
  playerNear: boolean;
  /** The biome Bello is standing in (e.g. "Meadow", "Forest") - he reacts to it. */
  place: string;
};

export type Episode = {
  cue: string | null;
  situation: string;
  action: string;
  reward: number;
};

export type BelloBrain = {
  /** Decide what Bello does for a cue (or spontaneously when cue is null). */
  decide(input: { cue: string | null; situation: Situation; actions: ActionDef[] }): Promise<LlmChoice>;
  /** Reward (or not) what Bello just did; attaches to the latest memory. */
  reward(value: number): void;
  readonly history: readonly Episode[];
  lastThought: string;
};

const MEMORY_LIMIT = 24;
const RECALL = 8;

const PERSONA = [
  'You are Bello, a playful, eager young dog in a training game. You are NOT an',
  'assistant. The human is your trainer. You can only DO things with your body -',
  'choose exactly one action from the allowed list.',
  'You learn from experience: if the trainer rewarded an action after a cue',
  'before, prefer it for that cue; if it was ignored (reward 0), try something',
  'else. Stay believable - a real dog: curious, food-motivated, sometimes silly.',
  'Reply ONLY as JSON {"thought": "...", "action": "<id>"} with a 1-sentence dog',
  'thought.',
].join(' ');

export function createBelloBrain(engine: LlmEngine): BelloBrain {
  const history: Episode[] = [];
  const brain: BelloBrain = {
    history,
    lastThought: '',
    decide: async ({ cue, situation, actions }) => {
      // Don't let Bello repeat his last trick back-to-back - with a tiny model
      // that keeps play varied and fun. Falls back to the full set if excluding
      // would leave nothing.
      const lastAction = history[history.length - 1]?.action;
      const available = actions.filter((a) => a.id !== lastAction);
      const choices = available.length ? available : actions;
      const system = `${PERSONA}\nAllowed actions: ${choices.map((a) => `${a.id} (${a.name})`).join(', ')}.`;
      const user = buildUserPrompt(cue, situation, history, choices);
      const choice = await engine.choose({ system, user, actions: choices.map((a) => a.id) });
      history.push({ cue, situation: describeSituation(situation), action: choice.action, reward: 0 });
      if (history.length > MEMORY_LIMIT) history.splice(0, history.length - MEMORY_LIMIT);
      brain.lastThought = choice.thought;
      return choice;
    },
    reward: (value) => {
      const last = history[history.length - 1];
      if (last) last.reward = value;
    },
  };
  return brain;
}

export function describeSituation(s: Situation): string {
  const parts: string[] = [];
  parts.push(`in the ${s.place.toLowerCase()}`);
  parts.push(s.playerNear ? 'trainer is close' : 'trainer is far');
  if (s.ballVisible) parts.push('a ball is out');
  return parts.join(', ');
}

export function buildUserPrompt(
  cue: string | null,
  situation: Situation,
  history: readonly Episode[],
  actions: ActionDef[],
): string {
  const lines: string[] = [];
  const recent = history.slice(-RECALL);
  if (recent.length) {
    lines.push('Your recent memory (cue -> action -> reward):');
    for (const e of recent) {
      lines.push(`- ${e.cue ?? 'no cue'} -> ${e.action} -> ${e.reward > 0 ? `rewarded ${e.reward}` : 'ignored'}`);
    }
  } else {
    lines.push('You have no memories yet - you are figuring things out.');
  }
  lines.push(`Situation: ${describeSituation(situation)}.`);
  const last = history[history.length - 1];
  if (last) {
    lines.push(`You just did "${last.action}". Be playful and varied - surprise the trainer with a different trick unless a cue was clearly rewarded as that one.`);
  }
  lines.push(cue ? `The trainer just signalled: "${cue}". What do you do?` : 'No cue right now - what do you do?');
  lines.push(`Choose one action id from: ${actions.map((a) => a.id).join(', ')}.`);
  return lines.join('\n');
}

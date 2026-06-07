import type { AudioBus } from './context';

export type SfxName =
  | 'bark'
  | 'eat'
  | 'pet'
  | 'throw'
  | 'complete'
  | 'biome'
  | 'clap'
  | 'whistle'
  | 'point'
  | 'snap'
  | 'good';

export function playSfx(bus: AudioBus, name: SfxName): void {
  const { ctx, master } = bus;
  if (bus.isMuted()) return;
  const t = ctx.currentTime;
  if (name === 'bark') return bark(ctx, master, t);
  if (name === 'eat') return noise(ctx, master, t, 0.12);
  if (name === 'pet') return tone(ctx, master, t, 520, 740, 0.16);
  if (name === 'throw') return tone(ctx, master, t, 380, 180, 0.18);
  if (name === 'complete') return arpeggio(ctx, master, t, [523, 659, 784, 1047]);
  if (name === 'biome') return arpeggio(ctx, master, t, [440, 660, 880]);
  // Human cues + reward - simple, pleasant, each its own little voice.
  if (name === 'clap') return arpeggio(ctx, master, t, [660, 880], 0.05, 0.1);
  if (name === 'whistle') return tone(ctx, master, t, 900, 1500, 0.18, 'sine');
  if (name === 'point') return tone(ctx, master, t, 700, 990, 0.12, 'triangle');
  if (name === 'snap') return tone(ctx, master, t, 1320, 880, 0.08, 'triangle');
  if (name === 'good') return arpeggio(ctx, master, t, [784, 1047, 1319], 0.07, 0.16);
}

function bark(ctx: AudioContext, dest: AudioNode, t: number): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(420, t);
  o.frequency.exponentialRampToValueAtTime(180, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.2);
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  f0: number,
  f1: number,
  dur: number,
  wave: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine',
): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(ctx: AudioContext, dest: AudioNode, t: number, dur: number): void {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(g).connect(dest);
  src.start(t);
}

function arpeggio(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  notes: number[],
  step = 0.08,
  dur = 0.18,
): void {
  notes.forEach((f, i) => tone(ctx, dest, t + i * step, f, f, dur));
}

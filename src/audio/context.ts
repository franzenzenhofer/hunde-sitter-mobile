type GlobalWithWebkitAudio = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export type AudioBus = {
  ctx: AudioContext;
  master: GainNode;
  unlock(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
};

const FADE_MS = 80;

export function createAudioBus(): AudioBus {
  const g = globalThis as GlobalWithWebkitAudio;
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  if (!Ctor) throw new Error('Web Audio API not supported');
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);

  let muted = false;

  return {
    ctx,
    master,
    unlock: () => {
      if (ctx.state === 'suspended') void ctx.resume();
    },
    setMuted: (m) => {
      muted = m;
      const target = m ? 0 : 0.6;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.linearRampToValueAtTime(target, now + FADE_MS / 1000);
    },
    isMuted: () => muted,
  };
}

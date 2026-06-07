import { Vector2, Vector3 } from 'three';
import { createLoop } from './core/loop';
import { on, emit } from './core/bus';
import { createRenderCtx } from './render/renderer';
import { addLighting } from './render/lighting';
import { addSky } from './render/sky';
import { createFollowCamera } from './render/follow-camera';
import { createFpsCounter } from './render/fps-counter';
import { createPlayer } from './entities/player';
import { createDog } from './entities/dog';
import { createBall } from './entities/ball';
import { createPickupBag } from './entities/pickups';
import { resolveAction, performAction, type ActionKind } from './entities/dog-action';
import { createStreamer } from './world/chunk-streamer';
import { resolveSeed, publishSeed } from './world/seed';
import { createJoystick } from './input/joystick';
import { createCameraDrag } from './input/camera-drag';
import { createKeyboard } from './input/keyboard';
import { createActionDock } from './ui/action-dock';
import { createGameRegistry, type CueId, type GameActionContext } from './actions/game-commands';
import { createActiveQuests } from './quests/active';
import { createAudioBus } from './audio/context';
import { playSfx } from './audio/sfx';
import { createMuteButton } from './audio/mute-button';
import { loadSave, maybeMigrateLegacyIdb } from './persistence/store';
import { startAutosave } from './persistence/autosave';
import { snapshot, restoreState } from './persistence/snapshot';
import { createParticles } from './render/particles';
import { createToast } from './ui/toast';
import { maybeShowOnboarding } from './ui/onboarding';
import { BIOMES } from './world/biomes';
import { installTestHooks } from './dev/test-hooks';
import { addButterflies } from './world/butterflies';
import { createDebugOverlay } from './ui/debug-overlay';
import { loadBuiltInPrimitives } from './training/registry';
import { createTrainingEngine } from './training/engine';
import { seedTricks } from './training/seed-tricks';
import { createMemoryPanel } from './ui/memory-panel';
import type { WorldContext } from './training/types';
import { createWllamaEngine } from './ai/llm';
import { createBelloBrain, type ActionDef, type Situation } from './ai/bello-brain';
import { createBrainStatus } from './ui/brain-status';

const ACTION_NEAR_DOG = 2.6;

export async function bootGame(stage: HTMLDivElement, ui: HTMLDivElement): Promise<void> {
  const seed = resolveSeed();
  publishSeed(seed);

  const ctx = createRenderCtx(stage);
  addSky(ctx.scene);
  const sun = addLighting(ctx.scene);
  const butterflies = addButterflies(ctx.scene);

  const bag = createPickupBag();
  const streamer = createStreamer(seed, ctx.scene, {
    onChunkLoad: (chunk) => {
      for (const p of chunk.pickups) bag.spawn(p.kind, p.x, p.z, ctx.scene);
    },
  });

  const player = createPlayer();
  const dog = createDog();
  const ball = createBall(ctx.scene);
  ctx.scene.add(player.group, dog.group);
  dog.group.position.set(2, 0, 2);
  let dogCarrying = false;

  const cam = createFollowCamera(ctx.camera, player.group);
  const fps = import.meta.env.DEV ? createFpsCounter(ui) : null;

  const joystick = createJoystick(ui);
  const drag = createCameraDrag();
  const keyboard = createKeyboard();
  const quests = createActiveQuests(seed);

  const audio = createAudioBus();
  createMuteButton(ui, audio);
  setupAudioUnlock(audio);
  setupAudioEvents(audio);

  const particles = createParticles();
  const toast = createToast(ui);
  setupParticleEvents(particles, ctx.scene, dog);
  setupBiomeToast(toast);
  maybeShowOnboarding(ui);
  createDebugOverlay(document.body);

  loadBuiltInPrimitives();
  const engine = createTrainingEngine();
  for (const trick of Object.values(seedTricks())) engine.registerTrick(trick);
  const memoryPanel = createMemoryPanel();
  ui.appendChild(memoryPanel.el);
  const refreshVocab = (): void => memoryPanel.update(brain.history, engine.state.tricks);

  const worldCtx: WorldContext = {
    dog,
    player,
    ballVisible: () => ball.mode === 'flying' || ball.mode === 'dropped',
    recentGestures: () => engine.state.gestures.slice(),
    recentBehaviors: () => engine.state.behaviors.map((b) => ({ id: b.trickId, t: b.t })),
    now: () => Date.now(),
  };

  // Bello's real brain: a tiny in-browser LLM that decides what the dog does,
  // using its memory of past cue -> action -> reward episodes as context. It
  // downloads in the background; until it's awake, the dog runs on instinct
  // (the lightweight conditioning engine) so the game is alive immediately.
  const llm = createWllamaEngine();
  const brain = createBelloBrain(llm);
  const brainStatus = createBrainStatus(ui);
  void llm
    .load((pct) => brainStatus.setProgress(pct))
    .then(() => brainStatus.setReady())
    .catch(() => brainStatus.setError());

  const situationNow = (): Situation => ({
    ballVisible: ball.mode === 'flying' || ball.mode === 'dropped',
    playerNear: player.group.position.distanceTo(dog.group.position) <= ACTION_NEAR_DOG,
  });
  const actionsNow = (): ActionDef[] =>
    Object.values(engine.state.tricks).map((t) => ({ id: t.id, name: t.name }));

  let thinking = false;
  let pendingCue: string | null = null; // a USER cue queued while Bello is mid-thought
  let lastUserCueAt = 0;
  const runBrain = (cue: string | null): void => {
    thinking = true;
    brainStatus.setThinking(true);
    void brain
      .decide({ cue, situation: situationNow(), actions: actionsNow() })
      .then((choice) => {
        if (choice.thought) toast.show(`💭 ${choice.thought}`);
        return engine.runTrick(choice.action, worldCtx);
      })
      .catch(() => undefined)
      .finally(() => {
        thinking = false;
        brainStatus.setThinking(false);
        refreshVocab();
        if (pendingCue !== null) {
          const c = pendingCue;
          pendingCue = null;
          runBrain(c); // a cue arrived while thinking - honour it now
        }
      });
  };
  const decideAndAct = (cue: string | null): void => {
    if (cue !== null) lastUserCueAt = performance.now();
    if (!llm.isReady()) {
      if (cue) void engine.presentCue(cue, worldCtx).then(() => refreshVocab()); // instinct
      return;
    }
    if (thinking) {
      if (cue !== null) pendingCue = cue; // never drop a trainer's cue; idle ticks are skipped
      return;
    }
    runBrain(cue);
  };
  const cueGesture = (id: string): void => decideAndAct(id);
  on('training:reward', ({ strength }) => {
    engine.recordReward(strength);
    brain.reward(strength);
    refreshVocab();
  });
  // Bello acts on his own now and then once awake - but never while busy and
  // never right after the trainer cued him, so the player always feels in charge.
  setInterval(() => {
    if (llm.isReady() && !thinking && performance.now() - lastUserCueAt > 8000) decideAndAct(null);
  }, 12000);
  on('dog:fed', () => {
    emit('training:reward', { strength: 1 });
  });
  on('dog:petted', () => {
    emit('training:reward', { strength: 0.5 });
  });
  setInterval(() => refreshVocab(), 1000);

  let lastPickedUp: 'ball' | 'treat' | null = null;
  const act = (kind: ActionKind): void =>
    performAction(kind, dog.stats, player.group.position, dog.group.position, ball, bag);
  const doAction = (): void => {
    const kind = resolveAction(player.group.position, dog.group.position, ball, bag, lastPickedUp);
    act(kind);
    if (kind === 'throw' || kind === 'feed') lastPickedUp = null;
  };
  keyboard.onAction(doAction);

  // The human action deck: only what the trainer can do (cues + rewards + play).
  // The dog is never driven by a button - it reacts to cues with its own AI.
  const gameCtx = (): GameActionContext => ({
    hasBall: bag.count('ball') > 0,
    hasTreat: bag.count('treat') > 0,
    ballInPlay: ball.mode !== 'idle',
    dogNear: player.group.position.distanceTo(dog.group.position) <= ACTION_NEAR_DOG,
    pet: () => act('pet'),
    feed: () => {
      act('feed');
      lastPickedUp = null;
    },
    throwBall: () => {
      act('throw');
      lastPickedUp = null;
    },
    reward: (strength) => emit('training:reward', { strength }),
    cue: (id: CueId) => cueGesture(id),
  });
  // Every human action gets a little voice + a trainer gesture. Feed/Pet/Throw
  // already make their own sound via the dog events they trigger, so only the
  // cues and the Good! marker add one here.
  const ACTION_SFX: Record<string, 'clap' | 'whistle' | 'point' | 'snap' | 'good'> = {
    clap: 'clap',
    whistle: 'whistle',
    point: 'point',
    snap: 'snap',
    reward: 'good',
  };
  const dock = createActionDock(ui, {
    registry: createGameRegistry(),
    context: gameCtx,
    now: () => performance.now(),
    counts: () => ({ ball: bag.count('ball'), treat: bag.count('treat') }),
    onFire: (id) => {
      player.gesture();
      const sfx = ACTION_SFX[id];
      if (sfx) playSfx(audio, sfx);
    },
  });

  let completedCount = 0;
  on('quest:complete', () => {
    completedCount++;
    playSfx(audio, 'complete');
  });

  await maybeMigrateLegacyIdb();
  const restored = loadSave();
  if (restored && restored.seed === seed) {
    restoreState(restored, { player, dog, quests });
    completedCount = restored.completedQuests;
  }

  if (restored?.tricks) for (const t of Object.values(restored.tricks)) engine.registerTrick(t);
  if (restored?.vocabulary) Object.assign(engine.state.vocabulary, restored.vocabulary);
  if (restored?.memoryCells) {
    for (const [k, v] of Object.entries(restored.memoryCells)) {
      engine.state.memory.set(Number(k), v);
    }
  }
  const ballInvRef: Record<string, number> = restored?.ballInventory ?? {};

  streamer.update(player.group.position, 0);
  startAutosave(() =>
    snapshot({
      seed,
      player,
      dog,
      quest: quests.current,
      completedQuests: completedCount,
      tricks: engine.state.tricks,
      vocabulary: engine.state.vocabulary,
      ballInventory: ballInvRef,
      memoryCells: Object.fromEntries(engine.state.memory.entries()),
    }),
  );
  installTestHooks({
    player,
    dog,
    ball,
    bag,
    streamer,
    scene: ctx.scene,
    engine,
    worldCtx,
    pet: doAction,
    doAction,
    cue: cueGesture,
  });

  const loop = createLoop();
  const moveInput = new Vector2();
  loop.add((dt) => {
    const { dx, dy, zoom, twist } = drag.consume();
    cam.yaw -= dx - twist;
    cam.pitch -= dy;
    cam.distance -= zoom;
    moveInput.copy(joystick.value);
    if (moveInput.lengthSq() < 0.0025) moveInput.copy(keyboard.value);
    player.move(moveInput, cam.yaw, dt);
    ball.update(dt);
    const ballWorld = new Vector3();
    ball.mesh.getWorldPosition(ballWorld);
    const ballForChase = ball.mode === 'flying' || (ball.mode === 'dropped' && !dogCarrying) ? ballWorld : null;
    dog.update(dt, player.group.position, ballForChase, dogCarrying);
    const dogMouth = new Vector3();
    dog.mesh.mouth.getWorldPosition(dogMouth);
    if (!dogCarrying && ball.mode !== 'idle' && ball.mode !== 'carried' && ball.caughtBy(dogMouth)) {
      ball.carryWith(dog.mesh.mouth);
      dogCarrying = true;
      playSfx(audio, 'bark');
    }
    if (
      dogCarrying &&
      ((dog.group.position.x - player.group.position.x) ** 2 +
        (dog.group.position.z - player.group.position.z) ** 2) < 2.56
    ) {
      const handoff = player.group.position.clone();
      handoff.x += (dog.group.position.x - player.group.position.x) * 0.5;
      handoff.z += (dog.group.position.z - player.group.position.z) * 0.5;
      ball.dropAt(ctx.scene, handoff);
      dogCarrying = false;
      playSfx(audio, 'bark');
    }
    if (ball.mode === 'dropped' && !dogCarrying) {
      const bw = new Vector3();
      ball.mesh.getWorldPosition(bw);
      const dx = bw.x - player.group.position.x;
      const dz = bw.z - player.group.position.z;
      if (dx * dx + dz * dz < 4) {
        ball.reset();
        bag.spawn('ball', player.group.position.x + 0.5, player.group.position.z + 0.5, ctx.scene);
        lastPickedUp = 'ball';
        playSfx(audio, 'pet');
      }
    }
    streamer.update(player.group.position, dt);
    bag.update(dt);
    const picked = bag.tryPickup(player.group.position, ctx.scene);
    if (picked) {
      lastPickedUp = picked;
      playSfx(audio, 'pet');
    }
    player.group.position.y = streamer.groundHeight(player.group.position.x, player.group.position.z);
    dog.group.position.y = streamer.groundHeight(dog.group.position.x, dog.group.position.z);
    player.animate(dt);
    dog.animate(dt);
    quests.walkProgress(player.group.position);
    dock.sync();
    particles.update(ctx.scene, dt);
    butterflies.update(dt, player.group.position);
    sun.update(dt, player.group.position);
    cam.update(dt);
    fps?.update(dt);
    ctx.renderer.render(ctx.scene, ctx.camera);
  });
  loop.start();
}

function setupAudioUnlock(audio: ReturnType<typeof createAudioBus>): void {
  const unlock = (): void => {
    audio.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

function setupAudioEvents(audio: ReturnType<typeof createAudioBus>): void {
  on('dog:petted', () => playSfx(audio, 'pet'));
  on('dog:played', () => playSfx(audio, 'throw'));
  on('dog:fed', () => playSfx(audio, 'eat'));
  on('biome:enter', () => playSfx(audio, 'biome'));
}

function setupParticleEvents(
  particles: ReturnType<typeof createParticles>,
  scene: Parameters<ReturnType<typeof createParticles>['burst']>[0],
  dog: ReturnType<typeof createDog>,
): void {
  on('dog:petted', () => particles.burst(scene, dog.group.position, 0xff6b9d, 16));
  on('dog:fed', () => particles.burst(scene, dog.group.position, 0xffd86b, 14));
  on('dog:played', () => particles.burst(scene, dog.group.position, 0x9beaff, 14));
  on('quest:complete', () => particles.burst(scene, dog.group.position, 0xffe066, 36));
  on('training:trick-executed', ({ success }) => {
    if (success) particles.burst(scene, dog.group.position, 0xc9b3ff, 12);
  });
}

function setupBiomeToast(toast: ReturnType<typeof createToast>): void {
  on('biome:enter', ({ biome }) => {
    const name = BIOMES[biome as keyof typeof BIOMES]?.name ?? biome;
    toast.show(name);
  });
}

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
import { createGameRegistry, type GameActionContext } from './actions/game-commands';
import { createTrickComposer } from './ui/trick-composer';
import { runProgram } from './training/interpreter';
import { createHud } from './ui/hud';
import { createPickupHud } from './ui/pickup-hud';
import { createActiveQuests } from './quests/active';
import { createQuestBanner } from './quests/banner';
import { grantReward } from './quests/rewards';
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
import { createVocabPanel } from './training/vocab-panel';
import type { WorldContext } from './training/types';

const ACTION_LABEL: Record<ActionKind, string> = {
  'pickup-ball': 'Pick',
  'pickup-treat': 'Pick',
  throw: 'Throw',
  feed: 'Feed',
  pet: 'Pet',
  wait: '...',
};

const PRIMARY_ICON: Record<ActionKind, string> = {
  'pickup-ball': '🫳',
  'pickup-treat': '🫳',
  throw: '🎾',
  feed: '🍖',
  pet: '❤️',
  wait: '⏳',
};

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
  const fps = createFpsCounter(ui);
  const hud = createHud(ui);
  const pickupHud = createPickupHud(ui);

  const joystick = createJoystick(ui);
  const drag = createCameraDrag();
  const keyboard = createKeyboard();
  const quests = createActiveQuests(seed);
  const banner = createQuestBanner(ui);

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
  const vocabPanel = createVocabPanel(ui, engine);

  const worldCtx: WorldContext = {
    dog,
    player,
    ballVisible: () => ball.mode === 'flying' || ball.mode === 'dropped',
    recentGestures: () => engine.state.gestures.slice(),
    recentBehaviors: () => engine.state.behaviors.map((b) => ({ id: b.trickId, t: b.t })),
    now: () => Date.now(),
  };

  on('gesture:clap', () => {
    void engine.presentCue('clap', worldCtx);
    engine.observeGesture('clap');
  });
  on('gesture:whistle', () => {
    void engine.presentCue('whistle', worldCtx);
    engine.observeGesture('whistle');
  });
  on('training:reward', ({ strength }) => {
    engine.recordReward(strength);
    vocabPanel.refresh();
  });
  on('dog:fed', () => {
    emit('training:reward', { strength: 1 });
  });
  on('dog:petted', () => {
    emit('training:reward', { strength: 0.5 });
  });
  setInterval(() => vocabPanel.refresh(), 1000);

  let lastPickedUp: 'ball' | 'treat' | null = null;
  const doAction = (): void => {
    const kind = resolveAction(player.group.position, dog.group.position, ball, bag, lastPickedUp);
    performAction(kind, dog.stats, player.group.position, dog.group.position, ball, bag);
    if (kind === 'throw' || kind === 'feed') lastPickedUp = null;
  };
  keyboard.onAction(doAction);

  // Explicit command palette: every care/play/train action the player can pick,
  // wired straight to real game effects. This is the full repertoire the single
  // contextual button could never expose.
  let trickBusy = false;
  const performTrick = (id: string): void => {
    if (trickBusy) return;
    trickBusy = true;
    void engine.runTrick(id, worldCtx).then((res) => {
      trickBusy = false;
      emit('training:trick-executed', { trickId: id, success: res.success });
    });
  };
  const gameCtx = (): GameActionContext => ({
    hasBall: bag.count('ball') > 0,
    hasTreat: bag.count('treat') > 0,
    ballInPlay: ball.mode !== 'idle',
    dogNear: player.group.position.distanceTo(dog.group.position) <= ACTION_NEAR_DOG,
    busy: trickBusy,
    pet: () => performAction('pet', dog.stats, player.group.position, dog.group.position, ball, bag),
    feed: () => {
      performAction('feed', dog.stats, player.group.position, dog.group.position, ball, bag);
      lastPickedUp = null;
    },
    throwBall: () => {
      performAction('throw', dog.stats, player.group.position, dog.group.position, ball, bag);
      lastPickedUp = null;
    },
    reward: (strength) => emit('training:reward', { strength }),
    cue: (gid) => {
      if (gid === 'clap') emit('gesture:clap', {});
      else emit('gesture:whistle', {});
    },
    performTrick,
    teach: () => composer.open(),
  });
  const dock = createActionDock(ui, {
    registry: createGameRegistry(),
    context: gameCtx,
    now: () => performance.now(),
    tricks: () => Object.values(engine.state.tricks).map((t) => ({ id: t.id, name: t.name })),
  });
  dock.onPrimary(doAction);
  dock.refreshTricks();
  setInterval(() => dock.refreshTricks(), 2000);

  // The Trick Composer: author a program, bind a cue, save it as a real trick.
  const composer = createTrickComposer(ui, {
    onSave: (trick) => {
      engine.registerTrick(trick);
      if (trick.cueGestureId) {
        // Give the player's chosen cue a strong head start so it works at once;
        // reinforcement can push it the rest of the way.
        const row = (engine.state.vocabulary[trick.cueGestureId] ??= {});
        row[trick.id] = { strength: 0.7, reinforcements: 1, lastReinforcedAt: Date.now() };
      }
      dock.refreshTricks();
      vocabPanel.refresh();
      toast.show(`Bello learned “${trick.name}”`);
    },
    onTest: (program) => {
      if (trickBusy) return;
      trickBusy = true;
      void runProgram(program, worldCtx, engine.state.memory, new AbortController().signal).finally(
        () => {
          trickBusy = false;
        },
      );
    },
    playerTricks: () =>
      Object.values(engine.state.tricks)
        .filter((t) => t.authoredBy === 'player')
        .map((t) => ({ id: t.id, name: t.name })),
    onDelete: (id) => {
      delete engine.state.tricks[id];
      dock.refreshTricks();
      vocabPanel.refresh();
    },
  });

  let completedCount = 0;
  on('quest:complete', () => {
    completedCount++;
    grantReward(dog.stats);
    playSfx(audio, 'complete');
    banner.update(quests.current);
  });

  await maybeMigrateLegacyIdb();
  const restored = loadSave();
  if (restored && restored.seed === seed) {
    restoreState(restored, { player, dog, quests });
    completedCount = restored.completedQuests;
  }
  banner.update(quests.current);

  if (restored?.tricks) for (const t of Object.values(restored.tricks)) engine.registerTrick(t);
  dock.refreshTricks();
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
  });

  const loop = createLoop();
  const moveInput = new Vector2();
  loop.add((dt) => {
    const { dx, dy } = drag.consume();
    cam.yaw -= dx;
    cam.pitch -= dy;
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
    banner.update(quests.current);
    const kind = resolveAction(player.group.position, dog.group.position, ball, bag, lastPickedUp);
    dock.setPrimary(PRIMARY_ICON[kind], ACTION_LABEL[kind], kind !== 'wait');
    dock.sync();
    hud.update(dog.stats);
    pickupHud.update(bag);
    particles.update(ctx.scene, dt);
    butterflies.update(dt, player.group.position);
    sun.update(dt, player.group.position);
    cam.update(dt);
    fps.update(dt);
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

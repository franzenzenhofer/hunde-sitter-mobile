import type { Scene } from 'three';
import { emit } from '../core/bus';
import type { Player } from '../entities/player';
import type { Dog } from '../entities/dog';
import type { Ball, BallMode } from '../entities/ball';
import type { PickupBag } from '../entities/pickups';
import type { Streamer } from '../world/chunk-streamer';
import { resolveBiome } from '../world/biomes';
import type { TrainingEngine } from '../training/engine';
import type { NodeResult, Program, Trick, WorldContext } from '../training/types';
import { allPrimitives } from '../training/registry';
import { runProgram } from '../training/interpreter';
import { newTrick } from '../training/trick';

declare global {
  interface Window {
    __hs?: {
      teleport(x: number, z: number): void;
      biomeAt(x: number, z: number): string;
      stats(): { hunger: number; fun: number; love: number };
      petDog(): void;
      grantBall(n?: number): void;
      throwBall(): boolean;
      ballMode(): BallMode;
      bagCounts(): { ball: number; treat: number };
      dogPos(): { x: number; z: number };
      listPrimitives(): Array<{ id: string; name: string; category: string }>;
      run(program: Program): Promise<NodeResult>;
      createTrick(input: {
        id?: string;
        name: string;
        cueGestureId?: string;
        program: Program;
      }): string;
      fireGesture(id: string): void;
      reward(strength?: number): void;
      vocabulary(): Record<string, Record<string, { strength: number }>>;
      memoryDump(): Record<number, number>;
      trickState(): Record<string, Trick>;
      simulateBehavior(trickId: string, success?: boolean): void;
    };
  }
}

export function installTestHooks(refs: {
  player: Player;
  dog: Dog;
  ball: Ball;
  bag: PickupBag;
  streamer: Streamer;
  scene: Scene;
  engine: TrainingEngine;
  worldCtx: WorldContext;
  pet(): void;
  doAction(): void;
  cue(id: string): void;
}): void {
  if (!import.meta.env.DEV && !window.location.search.includes('playtest=1')) return;
  window.__hs = {
    teleport: (x, z) => {
      refs.player.group.position.set(x, 0, z);
      refs.dog.group.position.set(x + 2, 0, z + 1);
      refs.streamer.update(refs.player.group.position, 0);
    },
    biomeAt: (x, z) =>
      resolveBiome(refs.streamer.noise.temperature(x, z), refs.streamer.noise.moisture(x, z)).id,
    stats: () => ({ ...refs.dog.stats }),
    petDog: () => refs.pet(),
    grantBall: (n = 1) => {
      for (let i = 0; i < n; i++) {
        refs.bag.spawn('ball', refs.player.group.position.x, refs.player.group.position.z, refs.scene);
      }
    },
    throwBall: () => {
      const before = refs.ball.mode;
      refs.doAction();
      return before !== refs.ball.mode;
    },
    ballMode: () => refs.ball.mode,
    bagCounts: () => ({ ball: refs.bag.count('ball'), treat: refs.bag.count('treat') }),
    dogPos: () => ({ x: refs.dog.group.position.x, z: refs.dog.group.position.z }),
    listPrimitives: () =>
      allPrimitives().map((p) => ({ id: p.id, name: p.name, category: p.category })),
    run: (program) =>
      runProgram(program, refs.worldCtx, refs.engine.state.memory, new AbortController().signal),
    createTrick: ({ id, name, cueGestureId, program }) => {
      const tid = id ?? `t-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      refs.engine.registerTrick(
        newTrick({
          id: tid,
          name,
          ...(cueGestureId ? { cueGestureId } : {}),
          program,
          authoredBy: 'player',
        }),
      );
      return tid;
    },
    fireGesture: (id) => refs.cue(id),
    reward: (strength = 1) => emit('training:reward', { strength }),
    vocabulary: () => refs.engine.state.vocabulary,
    memoryDump: () => Object.fromEntries(refs.engine.state.memory.entries()),
    trickState: () => refs.engine.state.tricks,
    simulateBehavior: (trickId, success = true) =>
      refs.engine.observeBehavior(trickId, { success }),
  };
}

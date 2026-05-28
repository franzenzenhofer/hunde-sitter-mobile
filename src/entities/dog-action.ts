import { Vector3 } from 'three';
import { clamp, type DogStats } from './dog-stats';
import { emit } from '../core/bus';
import type { Ball } from './ball';
import type { PickupBag } from './pickups';

export type ActionKind = 'pickup-ball' | 'pickup-treat' | 'throw' | 'feed' | 'pet' | 'wait';

const NEAR_DOG = 2.6;
const THROW_POWER = 11;

export function resolveAction(
  playerPos: Vector3,
  dogPos: Vector3,
  ball: Ball,
  bag: PickupBag,
  lastPickedUp: 'ball' | 'treat' | null,
): ActionKind {
  if (ball.alive) return 'wait';
  const dist = playerPos.distanceTo(dogPos);
  if (lastPickedUp === 'treat' && dist <= NEAR_DOG && bag.count('treat') > 0) return 'feed';
  if (lastPickedUp === 'ball' && bag.count('ball') > 0) return 'throw';
  if (dist <= NEAR_DOG) return 'pet';
  if (bag.count('ball') > 0) return 'throw';
  return 'pet';
}

export function performAction(
  kind: ActionKind,
  stats: DogStats,
  playerPos: Vector3,
  dogPos: Vector3,
  ball: Ball,
  bag: PickupBag,
): void {
  if (kind === 'pet') {
    stats.love = clamp(stats.love + 22);
    emit('dog:petted', {});
    return;
  }
  if (kind === 'feed') {
    if (!bag.consume('treat')) return;
    stats.hunger = clamp(stats.hunger + 32);
    emit('dog:fed', {});
    return;
  }
  if (kind === 'throw') {
    if (!bag.consume('ball')) return;
    const dir = new Vector3().subVectors(dogPos, playerPos);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    ball.throw(playerPos.clone().setY(1.4), dir, THROW_POWER);
    stats.fun = clamp(stats.fun + 18);
    emit('dog:played', {});
  }
}

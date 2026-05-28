import type { Primitive } from '../../types';
import { tween } from '../../_anim';

const walkForward: Primitive = {
  id: 'walk-forward',
  name: 'Walk forward',
  description: 'Bello walks forward by a small distance.',
  category: 'action',
  childCount: 'none',
  defaultArgs: { distance: 1 },
  async execute({ ctx, args, abort }) {
    const dist = Math.max(0.2, Math.min(5, args.distance ?? 1));
    const dog = ctx.dog.group;
    const startX = dog.position.x;
    const startZ = dog.position.z;
    const yaw = dog.rotation.y;
    const targetX = startX + Math.sin(yaw) * dist;
    const targetZ = startZ + Math.cos(yaw) * dist;
    const dur = Math.round(360 * dist);
    await Promise.all([
      tween((v) => (dog.position.x = v), startX, targetX, dur, abort),
      tween((v) => (dog.position.z = v), startZ, targetZ, dur, abort),
    ]);
    return { success: true };
  },
};
export default walkForward;

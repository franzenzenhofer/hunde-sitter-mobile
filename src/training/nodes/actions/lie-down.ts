import type { Primitive } from '../../types';
import { sleep, tween } from '../../_anim';

const lieDown: Primitive = {
  id: 'lie-down',
  name: 'Lie down',
  description: 'Bello sinks to the ground and rests, then gets back up.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const body = ctx.dog.mesh.body;
    const base = body.position.y;
    await tween((v) => (body.position.y = v), base, 0.14, 280, abort);
    await sleep(420, abort);
    await tween((v) => (body.position.y = v), 0.14, base, 240, abort);
    return { success: true };
  },
};
export default lieDown;

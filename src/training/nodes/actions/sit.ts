import type { Primitive } from '../../types';
import { sleep, tween } from '../../_anim';

const sit: Primitive = {
  id: 'sit',
  name: 'Sit',
  description: 'Bello tilts back into a sitting pose.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const body = ctx.dog.mesh.body;
    const baseY = body.position.y;
    await tween((v) => (body.rotation.x = v), 0, -0.5, 280, abort);
    await tween((v) => (body.position.y = v), baseY, baseY - 0.05, 200, abort);
    await sleep(400, abort);
    await tween((v) => (body.rotation.x = v), -0.5, 0, 220, abort);
    await tween((v) => (body.position.y = v), baseY - 0.05, baseY, 200, abort);
    return { success: true };
  },
};
export default sit;

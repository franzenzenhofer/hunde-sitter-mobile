import type { Primitive } from '../../types';
import { sleep, tween } from '../../_anim';

const pawUp: Primitive = {
  id: 'paw-up',
  name: 'Paw up',
  description: 'Bello lifts a front paw briefly.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const leg = ctx.dog.mesh.legs[0];
    if (!leg) return { success: false };
    await tween((v) => (leg.rotation.x = v), 0, -0.9, 200, abort);
    await sleep(500, abort);
    await tween((v) => (leg.rotation.x = v), -0.9, 0, 220, abort);
    return { success: true };
  },
};
export default pawUp;

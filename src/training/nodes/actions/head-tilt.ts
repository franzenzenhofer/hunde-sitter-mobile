import type { Primitive } from '../../types';
import { sleep, tween } from '../../_anim';

const headTilt: Primitive = {
  id: 'head-tilt',
  name: 'Tilt',
  description: 'Bello tilts his head, curious.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const head = ctx.dog.mesh.head;
    await tween((v) => (head.rotation.z = v), 0, 0.5, 200, abort);
    await sleep(500, abort);
    await tween((v) => (head.rotation.z = v), 0.5, 0, 200, abort);
    return { success: true };
  },
};
export default headTilt;

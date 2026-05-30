import type { Primitive } from '../../types';
import { sleep, tween } from '../../_anim';

const beg: Primitive = {
  id: 'beg',
  name: 'Beg',
  description: 'Bello sits up and begs with his front paws.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const body = ctx.dog.mesh.body;
    await tween((v) => (body.rotation.x = v), 0, -0.6, 240, abort);
    await sleep(520, abort);
    await tween((v) => (body.rotation.x = v), -0.6, 0, 240, abort);
    return { success: true };
  },
};
export default beg;

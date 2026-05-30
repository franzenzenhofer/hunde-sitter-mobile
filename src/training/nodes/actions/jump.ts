import type { Primitive } from '../../types';
import { tween } from '../../_anim';

const jump: Primitive = {
  id: 'jump',
  name: 'Jump',
  description: 'Bello crouches and springs straight up, then lands.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const body = ctx.dog.mesh.body;
    const base = body.position.y;
    await tween((v) => (body.position.y = v), base, base - 0.06, 90, abort);
    await tween((v) => (body.position.y = v), base - 0.06, base + 0.5, 200, abort);
    await tween((v) => (body.position.y = v), base + 0.5, base, 220, abort);
    return { success: true };
  },
};
export default jump;

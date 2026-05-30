import type { Primitive } from '../../types';
import { tween } from '../../_anim';

/** A whole-body shake-off — quick alternating roll (z), which the per-frame
 * animation never touches, so it wobbles and settles flat. */
const shake: Primitive = {
  id: 'shake',
  name: 'Shake',
  description: 'Bello shakes himself off from nose to tail.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const body = ctx.dog.mesh.body;
    let z = 0;
    for (let i = 0; i < 6; i++) {
      const to = i % 2 === 0 ? 0.2 : -0.2;
      await tween((v) => (body.rotation.z = v), z, to, 70, abort);
      z = to;
    }
    await tween((v) => (body.rotation.z = v), z, 0, 70, abort);
    return { success: true };
  },
};
export default shake;

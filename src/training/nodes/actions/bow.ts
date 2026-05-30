import type { Primitive } from '../../types';
import { sleep, tween } from '../../_anim';

/** A play-bow: front dips down, rear stays up. Body pitch (x) is free of the
 * per-frame animation channels, so it tips cleanly and resets flat. */
const bow: Primitive = {
  id: 'bow',
  name: 'Bow',
  description: 'Bello dips into a playful bow.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const body = ctx.dog.mesh.body;
    await tween((v) => (body.rotation.x = v), 0, 0.55, 220, abort);
    await sleep(420, abort);
    await tween((v) => (body.rotation.x = v), 0.55, 0, 220, abort);
    return { success: true };
  },
};
export default bow;

import type { Primitive } from '../../types';
import { tween } from '../../_anim';

/**
 * The salto: a forward somersault. Rotating the whole dog group on its pitch (x)
 * axis spins it over its front; arcing the body up at the same time gives the
 * airtime. Both channels are untouched by the per-frame ground/facing clamps, so
 * the motion plays cleanly and resets flat on landing.
 */
const flip: Primitive = {
  id: 'flip',
  name: 'Salto',
  description: 'Bello springs into a full forward somersault.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const dog = ctx.dog.group;
    const body = ctx.dog.mesh.body;
    const base = body.position.y;
    await tween((v) => (body.position.y = v), base, base - 0.08, 110, abort); // crouch
    await Promise.all([
      tween((v) => (dog.rotation.x = v), 0, -Math.PI * 2, 640, abort), // somersault
      (async () => {
        await tween((v) => (body.position.y = v), base - 0.08, base + 0.55, 320, abort);
        await tween((v) => (body.position.y = v), base + 0.55, base, 320, abort);
      })(),
    ]);
    dog.rotation.x = 0;
    return { success: true };
  },
};
export default flip;

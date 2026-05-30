import type { Primitive } from '../../types';
import { tween } from '../../_anim';

/** The mirror of the salto: a backward somersault (group pitch +2π). */
const backFlip: Primitive = {
  id: 'back-flip',
  name: 'Back-flip',
  description: 'Bello throws a full backward somersault.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const dog = ctx.dog.group;
    const body = ctx.dog.mesh.body;
    const base = body.position.y;
    await tween((v) => (body.position.y = v), base, base - 0.08, 110, abort);
    await Promise.all([
      tween((v) => (dog.rotation.x = v), 0, Math.PI * 2, 640, abort),
      (async () => {
        await tween((v) => (body.position.y = v), base - 0.08, base + 0.55, 320, abort);
        await tween((v) => (body.position.y = v), base + 0.55, base, 320, abort);
      })(),
    ]);
    dog.rotation.x = 0;
    return { success: true };
  },
};
export default backFlip;

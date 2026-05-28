import type { Primitive } from '../../types';
import { tween } from '../../_anim';

const spinCw: Primitive = {
  id: 'spin-cw',
  name: 'Spin clockwise',
  description: 'Bello spins 360° clockwise in place.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const dog = ctx.dog.group;
    const start = dog.rotation.y;
    await tween((v) => (dog.rotation.y = v), start, start - Math.PI * 2, 900, abort);
    dog.rotation.y = start;
    return { success: true };
  },
};
export default spinCw;

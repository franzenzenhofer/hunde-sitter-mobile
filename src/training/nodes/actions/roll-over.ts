import type { Primitive } from '../../types';
import { sleep, tween } from '../../_anim';

const rollOver: Primitive = {
  id: 'roll-over',
  name: 'Roll over',
  description: 'Bello rolls all the way over sideways and pops back up.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    const dog = ctx.dog.group;
    await tween((v) => (dog.rotation.z = v), 0, Math.PI * 2, 820, abort);
    dog.rotation.z = 0;
    await sleep(80, abort);
    return { success: true };
  },
};
export default rollOver;

import { emit } from '../../../core/bus';
import type { Primitive } from '../../types';
import { sleep, tween } from '../../_anim';

const bark: Primitive = {
  id: 'bark',
  name: 'Bark',
  description: 'Bello barks once.',
  category: 'action',
  childCount: 'none',
  async execute({ ctx, abort }) {
    emit('dog:played', {});
    const head = ctx.dog.mesh.head;
    const baseY = head.position.y;
    await tween((v) => (head.position.y = v), baseY, baseY + 0.1, 100, abort);
    await tween((v) => (head.position.y = v), baseY + 0.1, baseY, 120, abort);
    await sleep(120, abort);
    return { success: true };
  },
};
export default bark;

import type { Primitive } from '../../types';
import { sleep } from '../../_anim';

const pause: Primitive = {
  id: 'pause',
  name: 'Pause',
  description: 'Bello waits in place for a moment.',
  category: 'action',
  childCount: 'none',
  defaultArgs: { seconds: 1 },
  async execute({ args, abort }) {
    const sec = Math.max(0.1, Math.min(5, args.seconds ?? 1));
    await sleep(sec * 1000, abort);
    return { success: true };
  },
};
export default pause;

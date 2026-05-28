import type { Primitive } from '../../types';

const MAX_ITER = 10000;

const whileNode: Primitive = {
  id: 'while',
  name: 'While',
  description: 'While first child is nonzero, run second child. Capped at 10000 iterations.',
  category: 'control',
  childCount: { exact: 2 },
  async execute({ evalChild, abort }) {
    let iter = 0;
    while (iter < MAX_ITER) {
      if (abort.aborted) return { success: false };
      const cond = await evalChild(0);
      if (!cond) return { success: false };
      const truthy = cond.value !== undefined ? cond.value !== 0 : cond.success;
      if (!truthy) return { success: true };
      const body = await evalChild(1);
      if (!body) return { success: false };
      iter++;
    }
    return { success: false };
  },
};
export default whileNode;

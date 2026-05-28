import type { Primitive } from '../../types';

const seq: Primitive = {
  id: 'seq',
  name: 'Sequence',
  description: 'Run all children in order; succeeds if all succeed.',
  category: 'control',
  childCount: 'variable',
  async execute({ evalChild, childCount, abort }) {
    let allOk = true;
    for (let i = 0; i < childCount; i++) {
      if (abort.aborted) return { success: false };
      const r = await evalChild(i);
      if (!r) break;
      if (!r.success) allOk = false;
    }
    return { success: allOk };
  },
};
export default seq;

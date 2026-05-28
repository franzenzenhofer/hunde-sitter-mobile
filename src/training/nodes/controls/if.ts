import type { Primitive } from '../../types';

const ifNode: Primitive = {
  id: 'if',
  name: 'If/else',
  description: 'If first child returns nonzero, run second child; else run third.',
  category: 'control',
  childCount: { exact: 3 },
  async execute({ evalChild }) {
    const cond = await evalChild(0);
    const truthy = !!cond && (cond.value !== undefined ? cond.value !== 0 : cond.success);
    return (await evalChild(truthy ? 1 : 2)) ?? { success: false };
  },
};
export default ifNode;

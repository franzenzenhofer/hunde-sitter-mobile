import type { Primitive } from '../../types';

const mul: Primitive = {
  id: 'mul',
  name: 'Multiply',
  description: 'Return the product of two child values.',
  category: 'memory',
  childCount: { exact: 2 },
  async execute({ evalChild }) {
    const a = (await evalChild(0))?.value ?? 0;
    const b = (await evalChild(1))?.value ?? 0;
    return { success: true, value: a * b };
  },
};
export default mul;

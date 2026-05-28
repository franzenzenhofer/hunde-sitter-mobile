import type { Primitive } from '../../types';

const add: Primitive = {
  id: 'add',
  name: 'Add',
  description: 'Return the sum of two child values.',
  category: 'memory',
  childCount: { exact: 2 },
  async execute({ evalChild }) {
    const a = (await evalChild(0))?.value ?? 0;
    const b = (await evalChild(1))?.value ?? 0;
    return { success: true, value: a + b };
  },
};
export default add;

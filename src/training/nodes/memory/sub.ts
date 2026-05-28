import type { Primitive } from '../../types';

const sub: Primitive = {
  id: 'sub',
  name: 'Subtract',
  description: 'Return the first child minus the second.',
  category: 'memory',
  childCount: { exact: 2 },
  async execute({ evalChild }) {
    const a = (await evalChild(0))?.value ?? 0;
    const b = (await evalChild(1))?.value ?? 0;
    return { success: true, value: a - b };
  },
};
export default sub;

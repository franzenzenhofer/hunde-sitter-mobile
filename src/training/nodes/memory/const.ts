import type { Primitive } from '../../types';

const constNode: Primitive = {
  id: 'const',
  name: 'Constant',
  description: 'Return a fixed integer value.',
  category: 'memory',
  childCount: 'none',
  defaultArgs: { value: 0 },
  async execute({ args }) {
    return { success: true, value: args.value ?? 0 };
  },
};
export default constNode;

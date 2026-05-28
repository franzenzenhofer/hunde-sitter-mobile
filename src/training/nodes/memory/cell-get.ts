import type { Primitive } from '../../types';

const cellGet: Primitive = {
  id: 'cell-get',
  name: 'Read cell',
  description: 'Read the integer value stored in a memory cell.',
  category: 'memory',
  childCount: 'none',
  defaultArgs: { cellId: 0 },
  async execute({ memory, args }) {
    const id = args.cellId ?? 0;
    return { success: true, value: memory.get(id) ?? 0 };
  },
};
export default cellGet;

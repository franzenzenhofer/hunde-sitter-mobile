import type { Primitive } from '../../types';

const cellDec: Primitive = {
  id: 'cell-dec',
  name: 'Decrement cell',
  description: 'Subtract 1 from a memory cell; return the new value.',
  category: 'memory',
  childCount: 'none',
  defaultArgs: { cellId: 0 },
  async execute({ memory, args }) {
    const id = args.cellId ?? 0;
    const next = (memory.get(id) ?? 0) - 1;
    memory.set(id, next);
    return { success: true, value: next };
  },
};
export default cellDec;

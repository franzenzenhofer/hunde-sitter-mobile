import type { Primitive } from '../../types';

const cellInc: Primitive = {
  id: 'cell-inc',
  name: 'Increment cell',
  description: 'Add 1 to a memory cell; return the new value.',
  category: 'memory',
  childCount: 'none',
  defaultArgs: { cellId: 0 },
  async execute({ memory, args }) {
    const id = args.cellId ?? 0;
    const next = (memory.get(id) ?? 0) + 1;
    memory.set(id, next);
    return { success: true, value: next };
  },
};
export default cellInc;

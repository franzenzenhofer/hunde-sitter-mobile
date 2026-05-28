import type { Primitive } from '../../types';

const cellSet: Primitive = {
  id: 'cell-set',
  name: 'Write cell',
  description: 'Set a memory cell to the value of the child expression.',
  category: 'memory',
  childCount: { exact: 1 },
  defaultArgs: { cellId: 0 },
  async execute({ memory, args, evalChild }) {
    const id = args.cellId ?? 0;
    const r = await evalChild(0);
    const v = r?.value ?? 0;
    memory.set(id, v);
    return { success: true, value: v };
  },
};
export default cellSet;

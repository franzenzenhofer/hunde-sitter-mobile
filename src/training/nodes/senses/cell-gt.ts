import type { Primitive } from '../../types';

const cellGt: Primitive = {
  id: 'cell-gt',
  name: 'Cell greater than',
  description: 'Return 1 if cell value > literal, else 0.',
  category: 'sense',
  childCount: 'none',
  defaultArgs: { cellId: 0, value: 0 },
  async execute({ memory, args }) {
    const v = memory.get(args.cellId ?? 0) ?? 0;
    return { success: true, value: v > (args.value ?? 0) ? 1 : 0 };
  },
};
export default cellGt;

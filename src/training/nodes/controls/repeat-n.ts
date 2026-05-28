import type { Primitive } from '../../types';

const repeatN: Primitive = {
  id: 'repeat-n',
  name: 'Repeat N',
  description: 'Run the child N times in sequence.',
  category: 'control',
  childCount: { exact: 1 },
  defaultArgs: { n: 3 },
  async execute({ evalChild, args, abort }) {
    const n = Math.max(0, Math.min(1000, Math.floor(args.n ?? 0)));
    let allOk = true;
    for (let i = 0; i < n; i++) {
      if (abort.aborted) return { success: false };
      const r = await evalChild(0);
      if (!r || !r.success) allOk = false;
    }
    return { success: allOk };
  },
};
export default repeatN;

import type { Primitive } from '../../types';

const par: Primitive = {
  id: 'par',
  name: 'Parallel',
  description: 'Run all children at the same time; succeeds if all succeed.',
  category: 'control',
  childCount: 'variable',
  async execute({ evalChild, childCount }) {
    const tasks: Promise<{ success: boolean } | null>[] = [];
    for (let i = 0; i < childCount; i++) tasks.push(evalChild(i));
    const results = await Promise.all(tasks);
    const allOk = results.every((r) => r && r.success);
    return { success: allOk };
  },
};
export default par;

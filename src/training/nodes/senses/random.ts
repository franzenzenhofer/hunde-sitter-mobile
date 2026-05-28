import type { Primitive } from '../../types';

const random: Primitive = {
  id: 'random',
  name: 'Random 0/1',
  description: 'Return 0 or 1 with equal probability.',
  category: 'sense',
  childCount: 'none',
  async execute() {
    return { success: true, value: Math.random() < 0.5 ? 0 : 1 };
  },
};
export default random;

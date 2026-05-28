import type { Primitive } from '../../types';

const ballVisible: Primitive = {
  id: 'ball-visible',
  name: 'Ball visible?',
  description: 'Return 1 if a ball is currently in the scene.',
  category: 'sense',
  childCount: 'none',
  async execute({ ctx }) {
    return { success: true, value: ctx.ballVisible() ? 1 : 0 };
  },
};
export default ballVisible;

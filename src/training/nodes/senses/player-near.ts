import type { Primitive } from '../../types';

const RADIUS_SQ = 3 * 3;

const playerNear: Primitive = {
  id: 'player-near',
  name: 'Player near?',
  description: 'Return 1 if the player is within 3 units of the dog.',
  category: 'sense',
  childCount: 'none',
  async execute({ ctx }) {
    const dx = ctx.dog.group.position.x - ctx.player.group.position.x;
    const dz = ctx.dog.group.position.z - ctx.player.group.position.z;
    return { success: true, value: dx * dx + dz * dz < RADIUS_SQ ? 1 : 0 };
  },
};
export default playerNear;

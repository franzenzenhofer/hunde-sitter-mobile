import { describe, it, expect } from 'vitest';
import { Scene, Vector3 } from 'three';
import { createBall } from '../../src/entities/ball';

// Mouth height mirrors the rig: head (0.7) + mouth (0.55) ≈ 1.25 world units.
const MOUTH_Y = 1.25;
const mouthAt = (x: number, z: number) => new Vector3(x, MOUTH_Y, z);

describe('Ball.caughtBy — fetch reach', () => {
  it('catches a ball in flight when it passes near the mouth', () => {
    const ball = createBall(new Scene());
    ball.throw(new Vector3(0, 1.2, 0), new Vector3(0, 0, 1), 11); // mode: flying, y≈1.2
    expect(ball.caughtBy(mouthAt(0, 0))).toBe(true);
    expect(ball.caughtBy(mouthAt(0, 3))).toBe(false);
  });

  it('catches a ball resting on the ground despite the mouth being ~1m above it', () => {
    // Regression: a dropped ball sits at y≈0.17, so a full 3D reach (0.7) could
    // never grab it (vertical gap ≈1.08). The dog dips its head — horizontal only.
    const ball = createBall(new Scene());
    ball.dropAt(new Scene(), new Vector3(3, 0, 3)); // mode: dropped
    expect(ball.caughtBy(mouthAt(3, 3))).toBe(true); // standing over it → grab
    expect(ball.caughtBy(mouthAt(3.5, 3))).toBe(true); // within horizontal reach
    expect(ball.caughtBy(mouthAt(5, 5))).toBe(false); // too far horizontally
  });

  it('cannot be caught while idle or already carried', () => {
    const scene = new Scene();
    const ball = createBall(scene);
    expect(ball.caughtBy(mouthAt(0, 0))).toBe(false); // idle
    ball.dropAt(scene, new Vector3(0, 0, 0));
    ball.carryWith(scene); // mode: carried
    expect(ball.caughtBy(mouthAt(0, 0))).toBe(false);
  });

  it('runs the full throw → land → carry → reset cycle', () => {
    const scene = new Scene();
    const ball = createBall(scene);
    ball.throw(new Vector3(0, 1.2, 0), new Vector3(0, 0, 1), 11);
    expect(ball.mode).toBe('flying');
    // integrate physics until it settles
    for (let i = 0; i < 600 && ball.mode === 'flying'; i++) ball.update(1 / 60);
    expect(ball.mode).toBe('dropped');
    ball.carryWith(scene);
    expect(ball.mode).toBe('carried');
    ball.dropAt(scene, new Vector3(0, 0, 0));
    expect(ball.mode).toBe('dropped');
    ball.reset();
    expect(ball.mode).toBe('idle');
  });
});

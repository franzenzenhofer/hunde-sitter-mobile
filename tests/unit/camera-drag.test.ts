// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createCameraDrag, type CameraDrag } from '../../src/input/camera-drag';

// jsdom has no PointerEvent with clientX/pointerId; synthesize a minimal one.
function pointer(type: string, id: number, x: number, y: number): Event {
  const ev = new Event(type, { bubbles: true });
  Object.assign(ev, { pointerId: id, clientX: x, clientY: y });
  return ev;
}

const RIGHT = 900; // > innerWidth/2 (jsdom default width 1024)
const LEFT = 100;

let drag: CameraDrag;
beforeEach(() => {
  (window as unknown as { innerWidth: number }).innerWidth = 1024;
  drag = createCameraDrag();
});
afterEach(() => drag.destroy());

describe('camera drag - one finger looks', () => {
  it('accumulates look delta from a right-side drag', () => {
    window.dispatchEvent(pointer('pointerdown', 1, RIGHT, 400));
    window.dispatchEvent(pointer('pointermove', 1, RIGHT + 100, 450));
    const g = drag.consume();
    expect(g.dx).toBeGreaterThan(0);
    expect(g.dy).toBeGreaterThan(0);
    expect(g.zoom).toBe(0);
    expect(g.twist).toBe(0);
  });

  it('ignores the left half (that belongs to the joystick)', () => {
    window.dispatchEvent(pointer('pointerdown', 1, LEFT, 400));
    window.dispatchEvent(pointer('pointermove', 1, LEFT + 100, 400));
    expect(drag.consume()).toEqual({ dx: 0, dy: 0, zoom: 0, twist: 0 });
  });
});

describe('camera drag - two fingers pinch + twist', () => {
  it('pinching apart yields zoom and suppresses look', () => {
    window.dispatchEvent(pointer('pointerdown', 1, 600, 400));
    window.dispatchEvent(pointer('pointerdown', 2, 700, 400)); // 100px apart, baseline
    window.dispatchEvent(pointer('pointermove', 2, 800, 400)); // now 200px apart
    const g = drag.consume();
    expect(g.zoom).toBeGreaterThan(0); // apart => zoom in (distance decreases via -=)
    expect(g.dx).toBe(0); // no look while pinching
    expect(g.dy).toBe(0);
  });

  it('rotating the two-finger line yields twist', () => {
    window.dispatchEvent(pointer('pointerdown', 1, 600, 400));
    window.dispatchEvent(pointer('pointerdown', 2, 800, 400)); // horizontal baseline
    window.dispatchEvent(pointer('pointermove', 2, 800, 500)); // rotate the second point down
    const g = drag.consume();
    expect(Math.abs(g.twist)).toBeGreaterThan(0);
  });

  it('lifting back to one finger resumes look cleanly', () => {
    window.dispatchEvent(pointer('pointerdown', 1, 600, 400));
    window.dispatchEvent(pointer('pointerdown', 2, 700, 400));
    window.dispatchEvent(pointer('pointermove', 2, 800, 400));
    drag.consume();
    window.dispatchEvent(pointer('pointerup', 2, 800, 400));
    window.dispatchEvent(pointer('pointermove', 1, 650, 400)); // single finger again
    const g = drag.consume();
    expect(g.dx).toBeGreaterThan(0);
    expect(g.zoom).toBe(0);
  });
});

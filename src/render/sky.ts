import { Color, Fog, type Scene } from 'three';

const TOP = 0x6fb9ff;
const HORIZON = 0xfbe6c2;

export function addSky(scene: Scene): void {
  const c = new Color().lerpColors(new Color(HORIZON), new Color(TOP), 0.35);
  scene.background = c;
  scene.fog = new Fog(c.getHex(), 50, 180);
}

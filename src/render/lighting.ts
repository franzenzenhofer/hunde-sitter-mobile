import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  type Scene,
  type Vector3,
} from 'three';

export type Sun = {
  light: DirectionalLight;
  update(_dt: number, _follow: Vector3): void;
};

const SUN_PERIOD_SEC = 240;

export function addLighting(scene: Scene): Sun {
  const hemi = new HemisphereLight(0xfff4d8, 0x5d9a55, 0.85);
  scene.add(hemi);

  const ambient = new AmbientLight(0xfff2cf, 0.35);
  scene.add(ambient);

  const light = new DirectionalLight(0xfff2cf, 0.7);
  light.castShadow = false;
  light.position.set(20, 40, 12);
  scene.add(light);

  let t = SUN_PERIOD_SEC * 0.3;
  return {
    light,
    update: (dt) => {
      t += dt;
      const phase = ((t / SUN_PERIOD_SEC) % 1) * Math.PI * 2;
      light.intensity = 0.55 + 0.2 * (Math.sin(phase) * 0.5 + 0.5);
    },
  };
}

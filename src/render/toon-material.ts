import {
  DataTexture,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  SRGBColorSpace,
  type ColorRepresentation,
} from 'three';

const STEPS = new Uint8Array([60, 130, 200, 255]);

const gradient = new DataTexture(STEPS, STEPS.length, 1, RedFormat);
gradient.minFilter = NearestFilter;
gradient.magFilter = NearestFilter;
gradient.colorSpace = SRGBColorSpace;
gradient.needsUpdate = true;

export function toon(color: ColorRepresentation): MeshToonMaterial {
  return new MeshToonMaterial({ color, gradientMap: gradient });
}

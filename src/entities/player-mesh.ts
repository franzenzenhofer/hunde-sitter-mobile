import { BoxGeometry, Group, Mesh } from 'three';
import { toon } from '../render/toon-material';
import { createBlobShadow } from '../render/blob-shadow';

export type PlayerMesh = {
  group: Group;
  leftArm: Group;
  rightArm: Group;
  leftLeg: Group;
  rightLeg: Group;
  head: Group;
};

export function buildPlayerMesh(): PlayerMesh {
  const group = new Group();
  group.name = 'player';
  group.add(createBlobShadow(0.85));

  const torso = box(0.7, 0.7, 0.45, 0xff8a5c);
  torso.position.y = 0.95;
  group.add(torso);

  const head = new Group();
  head.position.y = 1.6;
  head.add(box(0.7, 0.7, 0.7, 0xffd9b8));
  const cap = box(0.74, 0.22, 0.74, 0x3aa6ff);
  cap.position.y = 0.36;
  head.add(cap);
  const brim = box(0.74, 0.05, 0.18, 0x2f8ad6);
  brim.position.set(0, 0.25, 0.38);
  head.add(brim);
  const eyeL = box(0.1, 0.1, 0.04, 0x1a1a1a);
  eyeL.position.set(0.15, 0.05, 0.36);
  const eyeR = box(0.1, 0.1, 0.04, 0x1a1a1a);
  eyeR.position.set(-0.15, 0.05, 0.36);
  head.add(eyeL, eyeR);
  const blushL = box(0.12, 0.05, 0.04, 0xff9eb5);
  blushL.position.set(0.25, -0.08, 0.36);
  const blushR = box(0.12, 0.05, 0.04, 0xff9eb5);
  blushR.position.set(-0.25, -0.08, 0.36);
  head.add(blushL, blushR);
  group.add(head);

  const leftArm = limb(0xff8a5c, 0.55);
  leftArm.position.set(0.45, 1.25, 0);
  const rightArm = limb(0xff8a5c, 0.55);
  rightArm.position.set(-0.45, 1.25, 0);

  const leftLeg = limb(0x3a4b6b, 0.6);
  leftLeg.position.set(0.18, 0.6, 0);
  const rightLeg = limb(0x3a4b6b, 0.6);
  rightLeg.position.set(-0.18, 0.6, 0);

  group.add(leftArm, rightArm, leftLeg, rightLeg);
  return { group, leftArm, rightArm, leftLeg, rightLeg, head };
}

function box(w: number, h: number, d: number, color: number): Mesh {
  return new Mesh(new BoxGeometry(w, h, d), toon(color));
}

function limb(color: number, length: number): Group {
  const pivot = new Group();
  const mesh = box(0.22, length, 0.22, color);
  mesh.position.y = -length / 2;
  pivot.add(mesh);
  return pivot;
}

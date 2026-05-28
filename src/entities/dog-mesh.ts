import { BoxGeometry, Group, Mesh } from 'three';
import { toon } from '../render/toon-material';
import { createBlobShadow } from '../render/blob-shadow';

export type DogMesh = {
  group: Group;
  body: Group;
  head: Group;
  tail: Group;
  legs: [Group, Group, Group, Group];
  mouth: Group;
};

const FUR = 0xd6a366;
const FUR_LIGHT = 0xefc28b;
const FUR_DARK = 0x9a6a36;

export function buildDogMesh(): DogMesh {
  const group = new Group();
  group.name = 'dog';
  group.add(createBlobShadow(0.95));

  const body = new Group();
  body.position.y = 0.45;
  body.add(box(0.7, 0.55, 1.0, FUR));
  const back = box(0.74, 0.12, 1.0, FUR_DARK);
  back.position.y = 0.34;
  body.add(back);
  group.add(body);

  const head = new Group();
  head.position.set(0, 0.7, 0.5);
  head.add(box(0.55, 0.55, 0.55, FUR_LIGHT));
  const snout = box(0.32, 0.28, 0.3, FUR_LIGHT);
  snout.position.set(0, -0.1, 0.32);
  head.add(snout);
  const nose = box(0.12, 0.1, 0.08, 0x1a1a1a);
  nose.position.set(0, -0.06, 0.5);
  head.add(nose);
  const eyeL = box(0.1, 0.12, 0.04, 0x1a1a1a);
  eyeL.position.set(0.13, 0.08, 0.27);
  const eyeR = box(0.1, 0.12, 0.04, 0x1a1a1a);
  eyeR.position.set(-0.13, 0.08, 0.27);
  head.add(eyeL, eyeR);
  const earL = box(0.16, 0.28, 0.08, FUR_DARK);
  earL.position.set(0.22, 0.32, 0);
  const earR = box(0.16, 0.28, 0.08, FUR_DARK);
  earR.position.set(-0.22, 0.32, 0);
  head.add(earL, earR);
  const mouth = new Group();
  mouth.position.set(0, -0.18, 0.55);
  head.add(mouth);
  group.add(head);

  const tail = new Group();
  tail.position.set(0, 0.6, -0.55);
  const tailBox = box(0.12, 0.12, 0.4, FUR_DARK);
  tailBox.position.set(0, 0.1, -0.18);
  tail.add(tailBox);
  group.add(tail);

  const legs: [Group, Group, Group, Group] = [
    legAt(0.22, 0.4),
    legAt(-0.22, 0.4),
    legAt(0.22, -0.4),
    legAt(-0.22, -0.4),
  ];
  for (const l of legs) group.add(l);

  return { group, body, head, tail, legs, mouth };
}

function box(w: number, h: number, d: number, color: number): Mesh {
  return new Mesh(new BoxGeometry(w, h, d), toon(color));
}

function legAt(x: number, z: number): Group {
  const pivot = new Group();
  pivot.position.set(x, 0.4, z);
  const m = box(0.18, 0.4, 0.2, FUR);
  m.position.y = -0.2;
  pivot.add(m);
  const paw = box(0.2, 0.1, 0.22, FUR_DARK);
  paw.position.y = -0.42;
  pivot.add(paw);
  return pivot;
}

import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three';

export function createBlobShadow(radius = 0.9): Mesh {
  const mat = new MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const mesh = new Mesh(new BoxGeometry(radius * 2, 0.02, radius * 2), mat);
  mesh.position.y = 0.03;
  mesh.renderOrder = 1;
  return mesh;
}

import { Mesh, PlaneGeometry, ShaderMaterial } from 'three';

const SIZE = 32;

const vs = `
varying vec2 vUv;
varying vec3 vLocal;
void main(){
  vUv = uv;
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;

const fs = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vLocal;
void main(){
  float w1 = sin(vLocal.x * 0.35 + uTime * 1.4);
  float w2 = sin(vLocal.y * 0.45 + uTime * 1.9);
  float w = (w1 + w2) * 0.5;
  vec3 deep = vec3(0.16, 0.46, 0.68);
  vec3 shallow = vec3(0.6, 0.86, 0.96);
  vec3 col = mix(deep, shallow, smoothstep(-0.2, 0.6, w));
  gl_FragColor = vec4(col, 0.78);
}`;

export type WaterPlane = {
  mesh: Mesh;
  update(dt: number): void;
};

export function buildWaterPlane(): WaterPlane {
  const mat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: vs,
    fragmentShader: fs,
    transparent: true,
  });
  const mesh = new Mesh(new PlaneGeometry(SIZE, SIZE, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(SIZE / 2, 0.08, SIZE / 2);
  return {
    mesh,
    update: (dt) => {
      mat.uniforms.uTime!.value += dt;
    },
  };
}

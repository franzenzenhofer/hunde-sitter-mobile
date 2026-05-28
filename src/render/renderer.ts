import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  ACESFilmicToneMapping,
  Color,
  SRGBColorSpace,
  PCFSoftShadowMap,
} from 'three';

export type RenderCtx = {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  resize(): void;
};

const SKY = 0x87ceeb;

export function createRenderCtx(host: HTMLElement): RenderCtx {
  const scene = new Scene();
  scene.background = new Color(SKY);

  const camera = new PerspectiveCamera(60, 1, 0.1, 500);
  camera.position.set(0, 6, 10);

  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;
  void PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);

  const resize = (): void => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  return { scene, camera, renderer, resize };
}

// post.js: post-processing chain RenderPass -> UnrealBloomPass -> OutputPass.
// The scene is rendered into a half-float target (4x MSAA on desktop) so bloom only lifts pixels above the
// luminance threshold: emissive and very bright surfaces.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const BLOOM = { strength: 0.7, radius: 0.35, threshold: 0.82 };

export function createPost(renderer, scene, camera, { samples = 4 } = {}) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, target);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    composer,
    bloom,
    setSize(width, height, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
    },
    render(dt) { composer.render(dt); },
    dispose() { composer.dispose(); },
  };
}

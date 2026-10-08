GOAL: renderer, camera rig, lights, post-processing, quality scaler. API: ARCHITECTURE.md "render".
FILES: src/render/renderer.js (exports createRenderer), src/render/camera.js, src/render/post.js, src/render/quality.js, tests/browser/render.html.
SPEC:
- WebGLRenderer(antialias: !mobile), SRGB output, PCFSoftShadowMap, pixelRatio min(dpr, mobile?1.5:2).
- Scene: sky-blue background + light fog. HemisphereLight + DirectionalLight sun (castShadow, 2048 map, ortho frustum fitted to arena in setArenaBounds, bias tuned, no acne/peter-panning).
- Camera: PerspectiveCamera fov ~40, pitch 55° down, looks toward -z; exponential damping follow; target clamped to arena; distance auto-fit to aspect (≈13 tiles wide landscape, ≈11 portrait).
- Shake: trauma-based decaying offset; subscribe EV.SCREEN_SHAKE.
- Post: EffectComposer(RenderPass, UnrealBloomPass(strength≈0.7, radius≈0.35, threshold≈0.82), OutputPass). Only emissive/bright things bloom.
- Quality: setQuality toggles shadows+bloom+pixelRatio; autoQuality: fps<45 sustained 3s → 'low', emit EV.QUALITY_CHANGE once.
- Draw calls: renderer.info.autoReset=false, reset at start of render(), report total.
- render(): zero allocations.
TESTS (desktop + --mobile): harness creates renderer, setArenaBounds(21,33), adds cubes, renders 30 frames; drawCalls>0; worldToScreen(target)≈viewport center; screenToGround(center)≈target ±0.5; setQuality('low') disables shadows+composer; shake no errors; resize updates aspect.

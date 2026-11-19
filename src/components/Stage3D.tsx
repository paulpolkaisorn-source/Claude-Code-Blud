import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from "postprocessing";
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../layout";
import { COLORS } from "../theme";

export type FxParams = {
  /** Bloom intensity (animated per scene). */
  bloom: number;
  /** Luminance threshold for bloom. */
  threshold?: number;
  /** Bloom radius 0..1. */
  radius?: number;
  /** Chromatic aberration offset in UV units (e.g. 0.001). */
  ca?: number;
};

/**
 * Post stack: Bloom + ChromaticAberration + tone mapping, built synchronously.
 *
 * Why not <EffectComposer> from @react-three/postprocessing: it assembles its passes
 * across several React commits, so under Remotion the first frame after every mount
 * (every still, every chunk start, every scene cut) came out empty. These are the same
 * `postprocessing` effect classes, created up front, so every frame renders identically.
 * Grain and vignette are applied once over the whole film in 2D (see Overlays.tsx).
 */
export const PostFX: React.FC<FxParams> = ({ bloom, threshold = 0.18, radius = 0.72, ca = 0.0008 }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    composer.addPass(new RenderPass(scene, camera));
    const bloomFx = new BloomEffect({ mipmapBlur: true, intensity: 1, luminanceThreshold: 0.18, luminanceSmoothing: 0.25, radius: 0.72, levels: 7 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const caFx = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0008, 0.0004), radialModulation: true, modulationOffset: 0.15 });
    composer.addPass(new EffectPass(camera, bloomFx, tone));
    composer.addPass(new EffectPass(camera, caFx));
    return { composer, bloomFx, caFx };
  }, [gl, scene, camera]);

  useLayoutEffect(() => {
    fx.composer.setSize(size.width, size.height);
  }, [fx, size.width, size.height]);

  // Animated parameters are set on the live effect objects (never re-created).
  useLayoutEffect(() => {
    fx.bloomFx.intensity = bloom;
    fx.bloomFx.luminanceMaterial.threshold = threshold;
    const mip = (fx.bloomFx as unknown as { mipmapBlurPass?: { radius: number } }).mipmapBlurPass;
    if (mip) mip.radius = radius;
    fx.caFx.offset.set(ca, ca * 0.5);
  });

  useEffect(() => () => fx.composer.dispose(), [fx]);

  useFrame(() => {
    fx.composer.render();
  }, 1);
  return null;
};

/** Sets the camera from props on every frame (deterministic, no controls). */
export const CameraRig: React.FC<{
  position: [number, number, number];
  lookAt?: [number, number, number];
  fov?: number;
  up?: [number, number, number];
  rotation?: [number, number, number];
  roll?: number;
}> = ({ position, lookAt, fov, up = [0, 1, 0], rotation, roll = 0 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.up.set(...up);
    if (rotation) {
      camera.rotation.order = "YXZ";
      camera.rotation.set(rotation[0], rotation[1], rotation[2]);
    } else if (lookAt) {
      camera.lookAt(...lookAt);
      if (roll) camera.rotateZ(roll);
    }
    if (fov !== undefined && Math.abs(camera.fov - fov) > 1e-6) {
      camera.fov = fov;
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

/** WebGL stage: one canvas, void background, synchronous post stack. */
export const Stage3D: React.FC<{
  children: React.ReactNode;
  fx: FxParams;
  fov?: number;
  near?: number;
  far?: number;
  background?: string;
}> = ({ children, fx, fov = 40, near = 0.05, far = 400, background = COLORS.void }) => {
  const L = useLayout();
  return (
    <AbsoluteFill style={{ background }}>
      <ThreeCanvas
        width={L.width}
        height={L.height}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        camera={{ fov, near, far, position: [0, 0, 10] }}
        dpr={1}
        linear={false}
        flat
      >
        <color attach="background" args={[background]} />
        {children}
        <PostFX {...fx} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

// ---------- shared 3D helpers ----------

/** HDR color: palette hex scaled above 1 so bloom picks it up, core clips toward white. */
export const hdr = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  return new THREE.Color(c.r * k, c.g * k, c.b * k);
};

let glowTex: THREE.Texture | null = null;
/** Soft radial sprite texture, generated in code (deterministic). */
export const getGlowTexture = () => {
  if (glowTex) return glowTex;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.6)");
  g.addColorStop(0.45, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
};

/** Additive glow billboard. */
export const GlowSprite: React.FC<{ position?: [number, number, number]; scale: number | [number, number]; color: string; opacity?: number; intensity?: number }> = ({
  position = [0, 0, 0],
  scale,
  color,
  opacity = 1,
  intensity = 1,
}) => {
  const tex = getGlowTexture();
  const s: [number, number, number] = Array.isArray(scale) ? [scale[0], scale[1], 1] : [scale, scale, 1];
  return (
    <sprite position={position} scale={s}>
      <spriteMaterial map={tex} color={hdr(color, intensity)} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </sprite>
  );
};

// GLSL injections for the block material (src/gl/blocks/material.ts; direction-3d 10.3 and 10.11).
// Each string is inserted into three 0.186.1's MeshPhysicalMaterial shader right after the #include
// marker that material.ts names for it. Keep the markers and these chunks in step.

/** Kireji finish: the same at every mix m (10.3). The shader literals below are generated from these. */
export const KIREJI_FINISH = {
  roughness: 0.36,
  clearcoat: 0.5,
  clearcoatRoughness: 0.22,
} as const;

/** Stretch along object y at uSmear 1: the block grows from 0.70 to 0.945 bu (10.11). */
export const SMEAR_STRETCH = 0.35;

/** Program cache key for the injected program. Change the suffix whenever a chunk below changes. */
export const BLOCK_PROGRAM_KEY = 'block-material/kireji-finish-smear/v1';

/** A GLSL float literal. GLSL needs a decimal point on whole numbers. */
function glslFloat(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

/** Vertex shader, after #include <common>. */
export const VERTEX_DECLARATIONS = `
// Block material: kireji finish flag and smear stretch (direction-3d 10.3 and 10.11).
in float aFinish;       // 1 on the kireji. Without the attribute WebGL supplies 0.
out float vFinish;
uniform float uSmear;   // 0 to 1, already damped by the caller
`;

/**
 * Vertex shader, after #include <beginnormal_vertex>. The smear is a scale along y, so the normal
 * takes the inverse transpose: its y is divided by the same factor and the result renormalised.
 * This runs before defaultnormal_vertex, which reads objectNormal.
 */
export const VERTEX_NORMAL_SMEAR = `
objectNormal.y /= 1.0 + ${glslFloat(SMEAR_STRETCH)} * uSmear;
objectNormal = normalize( objectNormal );
`;

/**
 * Vertex shader, after #include <begin_vertex>. transformed is in object space and the geometry is
 * centred on the origin, so the stretch is about each block's own centre, before the instance matrix.
 */
export const VERTEX_BEGIN_SMEAR_FINISH = `
transformed.y *= 1.0 + ${glslFloat(SMEAR_STRETCH)} * uSmear;
vFinish = aFinish;
`;

/** Fragment shader, after #include <common>. */
export const FRAGMENT_DECLARATIONS = `
in float vFinish;       // 1 on the kireji, 0 otherwise
`;

/**
 * Fragment shader, after #include <roughnessmap_fragment>, before lights_physical_fragment.
 * That chunk derives material.roughness and the anisotropic alpha from roughnessFactor, so the
 * kireji value has to be in place first.
 */
export const FRAGMENT_ROUGHNESS = `
roughnessFactor = mix( roughnessFactor, ${glslFloat(KIREJI_FINISH.roughness)}, vFinish );
`;

/**
 * Fragment shader, after #include <lights_physical_fragment>. The clearcoat fields exist only when
 * three compiles the clearcoat layer, which needs clearcoat above zero. material.ts keeps the
 * uniform above zero on mid and high, so the kireji layer is there at every m.
 */
export const FRAGMENT_CLEARCOAT = `
#ifdef USE_CLEARCOAT
  material.clearcoat = mix( material.clearcoat, ${glslFloat(KIREJI_FINISH.clearcoat)}, vFinish );
  material.clearcoatRoughness = mix( material.clearcoatRoughness, ${glslFloat(KIREJI_FINISH.clearcoatRoughness)}, vFinish );
#endif
`;

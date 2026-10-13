/*=============================================================================

    GrandMaster.fx  -  flagship post-process stack for Unishade + Roblox

    Pipeline (one technique, 22 passes, only ONE full-resolution pass):
        input linearization + highlight expansion          (half res)
        scene statistics / depth polarity / sky colour      (4x1)
        estimated-depth conditioning + bloom prefilter      (quarter res, MRT)
        colour-guided depth edge snapping                   (quarter res)
        geometry: normals, planarity, gloss, water, AO      (quarter res, MRT)
        screen-space reflections (stride-adaptive march)    (half res)
        reflection resolve: roughness blur + temporal       (half res)
        dual-filter bloom pyramid, 6 levels                 (1/8 .. 1/128)
        composite: reflections -> AO -> detail -> haze ->
                   bloom -> tonemap -> grade -> dither      (full res)

    Depth in Unishade is ESTIMATED (depth-anything-v2-small at ~266x154).
    Everything that touches depth is relative (scale-free), smoothed,
    colour-guided and confidence-weighted. Per-pixel normals from raw depth
    are never used.

    Original code. Requires ReShade.fxh (ships with every ReShade install).

=============================================================================*/

#include "ReShade.fxh"
#include "GrandMaster/GM_Common.fxh"

#define GM_HW (BUFFER_WIDTH / 2)
#define GM_HH (BUFFER_HEIGHT / 2)
#define GM_QW (BUFFER_WIDTH / 4)
#define GM_QH (BUFFER_HEIGHT / 4)

/*=============================================================================
    UI
=============================================================================*/

// ------------------------------------------------------------------ General
uniform int GM_Quality <
    ui_type = "combo"; ui_items = "Balanced\0High\0Extreme\0";
    ui_label = "Quality"; ui_category = "General";
    ui_tooltip = "Ray-march steps, AO directions and depth-filter taps.\n"
                 "High is the default and looks close to Extreme at a fraction of the cost.";
> = 1;

uniform int GM_Debug <
    ui_type = "combo";
    ui_items = "Off\0Depth (conditioned)\0Normals\0Reflection mask\0Reflections only\0Ambient occlusion\0Bloom only\0UI protection mask\0Detail delta\0Roughness / water / planarity\0";
    ui_label = "Debug view"; ui_category = "General";
    ui_tooltip = "Visualise intermediate buffers. Use 'Depth' first: near must be dark, far/sky white.";
> = 0;

// ------------------------------------------------------------------ Depth
uniform int GM_DepthMode <
    ui_type = "combo"; ui_items = "ReShade linearized (global depth settings)\0Raw buffer value\0Raw buffer value, inverted\0";
    ui_label = "Depth source"; ui_category = "Estimated depth"; ui_category_closed = true;
    ui_tooltip = "How the Unishade depth estimate is read.\nKeep 'ReShade linearized' unless the Depth debug view looks wrong.";
> = 0;

uniform int GM_DepthPolarity <
    ui_type = "combo"; ui_items = "Auto (detect near/far)\0As provided\0Flip\0";
    ui_label = "Depth polarity"; ui_category = "Estimated depth";
    ui_tooltip = "Auto compares the top and bottom of the screen over time and flips the depth\nif near/far are swapped. Hysteresis prevents flicker.";
> = 0;

uniform int GM_DepthResponse <
    ui_type = "combo"; ui_items = "Auto (pick the more planar interpretation)\0Linear depth\0Disparity-like (inverse depth)\0";
    ui_label = "Depth response"; ui_category = "Estimated depth";
    ui_tooltip = "Depth estimators output inverse depth. Auto tests which reading makes the\n"
                 "(very blocky) Roblox scene more planar and uses that, with hysteresis.";
> = 0;

uniform float GM_FOV <
    ui_type = "slider"; ui_min = 40.0; ui_max = 110.0; ui_step = 1.0;
    ui_label = "Camera vertical FOV"; ui_category = "Estimated depth";
    ui_tooltip = "Roblox default is 70. Only affects reflection/AO geometry.";
> = 70.0;

uniform float GM_SkyDepth <
    ui_type = "slider"; ui_min = 0.80; ui_max = 0.999; ui_step = 0.001;
    ui_label = "Sky depth threshold"; ui_category = "Estimated depth";
    ui_tooltip = "Pixels at or beyond this depth are treated as sky (early-out for AO, SSR, detail).";
> = 0.985;

uniform float GM_DepthTemporal <
    ui_type = "slider"; ui_min = 0.0; ui_max = 0.9;
    ui_label = "Depth temporal smoothing"; ui_category = "Estimated depth";
    ui_tooltip = "Blends the depth estimate with the previous frame where it barely changed.\nRemoves estimator flicker; resets automatically on real motion.";
> = 0.5;

uniform float GM_DepthEdgeSnap <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Depth edge snapping"; ui_category = "Estimated depth";
    ui_tooltip = "Snaps the soft, low-res depth edges to the real colour edges (joint-bilateral).";
> = 1.0;

// ------------------------------------------------------------------ Reflections
uniform bool GM_SSR_Enable <
    ui_label = "Enable reflections"; ui_category = "Reflections";
> = true;

uniform float GM_SSR_Strength <
    ui_type = "slider"; ui_min = 0.0; ui_max = 4.0;
    ui_label = "Reflection strength"; ui_category = "Reflections";
    ui_tooltip = "Multiplier on the Fresnel reflectance.";
> = 2.5;

uniform float GM_SSR_F0 <
    ui_type = "slider"; ui_min = 0.02; ui_max = 0.5;
    ui_label = "Base reflectance (F0)"; ui_category = "Reflections";
    ui_tooltip = "Schlick F0. 0.02 water, 0.04 plastic, higher = polished / lacquered look.";
> = 0.1;

uniform float GM_SSR_Gloss <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Glossiness"; ui_category = "Reflections";
    ui_tooltip = "Global smoothness. Lower = blurrier, softer reflections.";
> = 0.7;

uniform float GM_SSR_TexGloss <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Texture-aware gloss"; ui_category = "Reflections";
    ui_tooltip = "How much busy textures (grass, gravel) reduce gloss compared to flat plastic.";
> = 1.0;

uniform float GM_SSR_FloorMin <
    ui_type = "slider"; ui_min = 0.2; ui_max = 0.9;
    ui_label = "Floor detection threshold"; ui_category = "Reflections";
    ui_tooltip = "Minimum upward tilt (from smoothed depth) for a surface to count as floor.";
> = 0.45;

uniform float GM_SSR_Vertical <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Non-floor glossy parts"; ui_category = "Reflections";
    ui_tooltip = "Reflections on flat walls / glossy parts that are not floors.\nOff by default: vertical geometry is the least reliable part of estimated depth.";
> = 0.0;

uniform float GM_SSR_FloorSnap <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Floor plane snapping"; ui_category = "Reflections";
    ui_tooltip = "Floor pixels use one frame-wide floor plane (fitted over thousands of pixels,\n"
                 "no camera roll) instead of their noisy local normal: straight, stable mirror images.";
> = 0.85;

uniform float GM_SSR_Water <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Water reflections"; ui_category = "Reflections";
    ui_tooltip = "Extra reflectance for blue/teal flat surfaces (Roblox water), F0 = 0.02.";
> = 1.0;

uniform float GM_SSR_Ripple <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Water ripple distortion"; ui_category = "Reflections";
> = 0.5;

uniform float GM_SSR_Env <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Sky fallback on miss"; ui_category = "Reflections";
    ui_tooltip = "When a ray leaves the screen it reflects the measured sky colour instead of going black.";
> = 0.4;

uniform float GM_SSR_Thickness <
    ui_type = "slider"; ui_min = 0.01; ui_max = 0.3;
    ui_label = "Ray thickness"; ui_category = "Reflections";
    ui_tooltip = "Relative depth tolerance for a hit. Larger = more coherent, less exact.";
> = 0.06;

uniform float GM_SSR_MaxDist <
    ui_type = "slider"; ui_min = 0.2; ui_max = 4.0;
    ui_label = "Max ray length"; ui_category = "Reflections";
> = 1.5;

uniform float GM_SSR_Temporal <
    ui_type = "slider"; ui_min = 0.0; ui_max = 0.95;
    ui_label = "Temporal accumulation"; ui_category = "Reflections";
    ui_tooltip = "History weight. Variance clipping keeps it ghost-free when the camera moves.";
> = 0.8;

uniform float GM_SSR_EdgeFade <
    ui_type = "slider"; ui_min = 0.01; ui_max = 0.3;
    ui_label = "Screen edge fade"; ui_category = "Reflections";
> = 0.08;

// ------------------------------------------------------------------ AO
uniform bool GM_AO_Enable <
    ui_label = "Enable ambient occlusion"; ui_category = "Ambient occlusion"; ui_category_closed = true;
> = true;

uniform float GM_AO_Strength <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "AO strength"; ui_category = "Ambient occlusion";
> = 0.5;

uniform float GM_AO_Radius <
    ui_type = "slider"; ui_min = 0.3; ui_max = 3.0;
    ui_label = "AO radius"; ui_category = "Ambient occlusion";
> = 1.0;

uniform float GM_AO_Range <
    ui_type = "slider"; ui_min = 0.02; ui_max = 0.5;
    ui_label = "AO depth range"; ui_category = "Ambient occlusion";
    ui_tooltip = "Relative depth difference over which occluders count. Small = contact shadows only, no halos.";
> = 0.12;

uniform float GM_AO_Bounce <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "AO multi-bounce colour"; ui_category = "Ambient occlusion";
    ui_tooltip = "Keeps occluded bright surfaces from turning grey (GTAO multi-bounce approximation).";
> = 0.5;

// ------------------------------------------------------------------ Detail
uniform bool GM_Detail_Enable <
    ui_label = "Enable detail"; ui_category = "Detail";
> = true;

uniform float GM_Sharpen <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.5;
    ui_label = "Fine sharpening"; ui_category = "Detail";
    ui_tooltip = "Luma-only, edge-aware 3x3 sharpening with overshoot clamp.";
> = 0.5;

uniform float GM_MicroContrast <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.5;
    ui_label = "Micro-contrast"; ui_category = "Detail";
    ui_tooltip = "Mid-frequency texture detail (studs, bricks, rock).";
> = 0.45;

uniform float GM_LocalContrast <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Local contrast (clarity)"; ui_category = "Detail";
    ui_tooltip = "Large-scale local contrast, soft-limited so strong edges do not halo.";
> = 0.2;

uniform float GM_DetailLimit <
    ui_type = "slider"; ui_min = 0.01; ui_max = 0.2;
    ui_label = "Detail limiter"; ui_category = "Detail";
    ui_tooltip = "Soft cap on how much any band can change luma.";
> = 0.06;

uniform float GM_Overshoot <
    ui_type = "slider"; ui_min = 0.0; ui_max = 0.1;
    ui_label = "Overshoot clamp"; ui_category = "Detail";
    ui_tooltip = "Allowed overshoot beyond the local 3x3 min/max. 0 = no halos/ringing at all.";
> = 0.012;

uniform float GM_DebandStrength <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Deband"; ui_category = "Detail";
    ui_tooltip = "Smooths 8-bit banding in flat gradients (sky) before sharpening.";
> = 1.0;

uniform float GM_DetailDistanceFade <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Detail distance fade"; ui_category = "Detail";
    ui_tooltip = "Reduces detail enhancement on far geometry (depth-guided) to avoid crunchy distance.";
> = 0.5;

// ------------------------------------------------------------------ Bloom
uniform bool GM_Bloom_Enable <
    ui_label = "Enable bloom"; ui_category = "Bloom";
> = true;

uniform float GM_Bloom_Strength <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Bloom strength"; ui_category = "Bloom";
> = 0.35;

uniform float GM_Bloom_Threshold <
    ui_type = "slider"; ui_min = 0.3; ui_max = 0.98;
    ui_label = "Threshold (display linear)"; ui_category = "Bloom";
    ui_tooltip = "Brightness where glow starts. 0.85 linear ~ sRGB 0.93: sun, lamps, neon, speculars.";
> = 0.85;

uniform float GM_Bloom_Knee <
    ui_type = "slider"; ui_min = 0.05; ui_max = 1.0;
    ui_label = "Soft knee"; ui_category = "Bloom";
> = 0.3;

uniform float GM_Bloom_Radius <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Radius"; ui_category = "Bloom";
    ui_tooltip = "0 = tight glow, 1 = wide atmospheric glow.";
> = 0.45;

uniform float GM_Bloom_Conserve <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Energy conservation"; ui_category = "Bloom";
    ui_tooltip = "1 = glow energy is taken from the source (no overall brightening / haze).";
> = 0.5;

uniform float GM_Bloom_Adapt <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Light adaptation"; ui_category = "Bloom";
    ui_tooltip = "Reduces bloom in bright scenes and raises it slightly in dark ones.";
> = 0.6;

uniform float GM_Bloom_TextReject <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Thin-feature rejection"; ui_category = "Bloom";
    ui_tooltip = "Morphological erosion in the prefilter: thin bright strokes (UI text) do not glow.";
> = 1.0;

// ------------------------------------------------------------------ Tone & colour
uniform bool GM_Tone_Enable <
    ui_label = "Enable tone & colour"; ui_category = "Tone & colour";
> = true;

uniform float GM_Expansion <
    ui_type = "slider"; ui_min = 0.0; ui_max = 0.9;
    ui_label = "Highlight headroom"; ui_category = "Tone & colour";
    ui_tooltip = "Reversible inverse-tonemap strength. Higher = softer highlight roll-off for added light.";
> = 0.75;

uniform float GM_Exposure <
    ui_type = "slider"; ui_min = -1.0; ui_max = 1.0;
    ui_label = "Exposure (EV)"; ui_category = "Tone & colour";
> = 0.0;

uniform float GM_Contrast <
    ui_type = "slider"; ui_min = -0.5; ui_max = 0.5;
    ui_label = "Filmic contrast"; ui_category = "Tone & colour";
    ui_tooltip = "S-curve around mid grey with toe and shoulder; black and white points stay fixed.";
> = 0.08;

uniform float GM_HighlightDesat <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Highlight desaturation"; ui_category = "Tone & colour";
    ui_tooltip = "Added light (bloom) desaturates towards white like real overexposure.";
> = 0.5;

uniform float GM_Temperature <
    ui_type = "slider"; ui_min = -1.0; ui_max = 1.0;
    ui_label = "White balance: temperature"; ui_category = "Tone & colour";
> = 0.0;

uniform float GM_Tint <
    ui_type = "slider"; ui_min = -1.0; ui_max = 1.0;
    ui_label = "White balance: tint"; ui_category = "Tone & colour";
> = 0.0;

uniform float GM_Vibrance <
    ui_type = "slider"; ui_min = -0.5; ui_max = 1.0;
    ui_label = "Vibrance"; ui_category = "Tone & colour";
    ui_tooltip = "Saturation boost weighted towards muted colours.";
> = 0.18;

uniform float GM_Saturation <
    ui_type = "slider"; ui_min = 0.5; ui_max = 1.5;
    ui_label = "Saturation"; ui_category = "Tone & colour";
> = 1.0;

uniform float GM_SkinProtect <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Skin-tone protection"; ui_category = "Tone & colour";
> = 0.7;

uniform float GM_NeutralProtect <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Neutral protection"; ui_category = "Tone & colour";
    ui_tooltip = "Keeps greys and whites neutral (no colour cast amplification).";
> = 0.8;

// ------------------------------------------------------------------ Atmosphere
uniform bool GM_Haze_Enable <
    ui_label = "Enable depth haze"; ui_category = "Atmosphere"; ui_category_closed = true;
> = true;

uniform float GM_Haze_Strength <
    ui_type = "slider"; ui_min = 0.0; ui_max = 0.6;
    ui_label = "Haze strength"; ui_category = "Atmosphere";
    ui_tooltip = "Subtle aerial perspective towards the measured sky colour.";
> = 0.06;

uniform float GM_Haze_Start <
    ui_type = "slider"; ui_min = 0.0; ui_max = 0.95;
    ui_label = "Haze start (scene-relative distance)"; ui_category = "Atmosphere";
    ui_tooltip = "0 = nearest part of the scene, 1 = farthest. Distance is normalised per frame\nfrom the scene's own depth statistics, because estimated depth has no units.";
> = 0.7;

// ------------------------------------------------------------------ Film
uniform float GM_Vignette <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Vignette"; ui_category = "Film"; ui_category_closed = true;
> = 0.0;

uniform float GM_Grain <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "Film grain"; ui_category = "Film";
> = 0.0;

uniform bool GM_Dither <
    ui_label = "Output dither"; ui_category = "Film";
    ui_tooltip = "Triangular 1-LSB dither, prevents banding from the grade.";
> = true;

// ------------------------------------------------------------------ UI protection
uniform float GM_UI_Protect <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "UI protection"; ui_category = "UI protection";
    ui_tooltip = "Keeps Roblox UI (top bar, white text, icons) free of bloom, sharpening,\nreflections and AO.";
> = 1.0;

uniform float GM_UI_TopBar <
    ui_type = "slider"; ui_min = 0.0; ui_max = 0.15; ui_step = 0.001;
    ui_label = "Top bar height (fraction)"; ui_category = "UI protection";
    ui_tooltip = "Height of the Roblox top bar as a fraction of the screen. 0 disables.";
> = 0.05;

uniform bool GM_UI_TextDetect <
    ui_label = "Detect UI text / icons"; ui_category = "UI protection";
    ui_tooltip = "High-contrast, near-white, low-saturation strokes are left untouched.";
> = true;

uniform float GM_UI_GradeProtect <
    ui_type = "slider"; ui_min = 0.0; ui_max = 1.0;
    ui_label = "UI grade protection"; ui_category = "UI protection";
    ui_tooltip = "How much of the global colour grade (contrast, vibrance, tone) is skipped on\ndetected UI: top bar, text strokes, flat white panels. 1 = UI keeps its exact colours.";
> = 1.0;

// ------------------------------------------------------------------ runtime
uniform int GM_Frame < source = "framecount"; >;
uniform float GM_FrameTime < source = "frametime"; >;

/*=============================================================================
    Textures & samplers
=============================================================================*/

#define GM_LINEAR_SAMPLER(name, tex) sampler name { Texture = tex; AddressU = CLAMP; AddressV = CLAMP; MinFilter = LINEAR; MagFilter = LINEAR; MipFilter = LINEAR; }
#define GM_POINT_SAMPLER(name, tex)  sampler name { Texture = tex; AddressU = CLAMP; AddressV = CLAMP; MinFilter = POINT;  MagFilter = POINT;  MipFilter = POINT;  }

// half-res expanded linear colour (rgb) + perceptual luma (a), with mips
texture GM_ColorHTex   { Width = GM_HW; Height = GM_HH; Format = RGBA16F; MipLevels = 6; };
GM_LINEAR_SAMPLER(sGM_ColorH, GM_ColorHTex);

// half-res UI likelihood (text strokes, flat white panels; the top band is separate)
texture GM_UIHTex      { Width = GM_HW; Height = GM_HH; Format = R8; };
GM_LINEAR_SAMPLER(sGM_UIH, GM_UIHTex);

// scene statistics: [0] polarity, polarity score, sky fraction, mean luma
//                   [1] sky colour  [2] top band colour  [3] mean scene colour + motion
//                   [4] depth response (+1 linear / -1 disparity), score, mean log z, sigma log z
//                   [5] frame-wide floor normal (view space) + confidence
texture GM_StatsTex     { Width = 6; Height = 1; Format = RGBA32F; };
// tiny copy of the previous frame for static-camera detection
texture GM_PrevSmallTex { Width = BUFFER_WIDTH / 32; Height = BUFFER_HEIGHT / 32; Format = R16F; };
texture GM_StatsHistTex { Width = 6; Height = 1; Format = RGBA32F; };
GM_POINT_SAMPLER(sGM_Stats, GM_StatsTex);
GM_POINT_SAMPLER(sGM_StatsHist, GM_StatsHistTex);
GM_LINEAR_SAMPLER(sGM_PrevSmall, GM_PrevSmallTex);

// quarter-res conditioned depth (r) + guide luma (g)
texture GM_DepthQTex     { Width = GM_QW; Height = GM_QH; Format = RG16F; };
texture GM_DepthQHistTex { Width = GM_QW; Height = GM_QH; Format = R16F; };
texture GM_DepthSTex     { Width = GM_QW; Height = GM_QH; Format = RG16F; };
GM_LINEAR_SAMPLER(sGM_DepthQ, GM_DepthQTex);
GM_POINT_SAMPLER(sGM_DepthQPoint, GM_DepthQTex);
GM_LINEAR_SAMPLER(sGM_DepthQHist, GM_DepthQHistTex);
GM_LINEAR_SAMPLER(sGM_DepthS, GM_DepthSTex);

// geometry: (normal.x, normal.y, reflectivity, ao) / (roughness, water, planarity, floor)
//           composite helper: (depth, guide luma, ao, 0)
texture GM_GeoQTex   { Width = GM_QW; Height = GM_QH; Format = RGBA16F; };
texture GM_Geo2QTex  { Width = GM_QW; Height = GM_QH; Format = RGBA8; };
texture GM_CompQTex  { Width = GM_QW; Height = GM_QH; Format = RGBA16F; };
GM_LINEAR_SAMPLER(sGM_GeoQ, GM_GeoQTex);
GM_LINEAR_SAMPLER(sGM_Geo2Q, GM_Geo2QTex);
GM_POINT_SAMPLER(sGM_CompQ, GM_CompQTex);
GM_LINEAR_SAMPLER(sGM_CompQLin, GM_CompQTex);

// reflections (half res)
texture GM_SSRTex     { Width = GM_HW; Height = GM_HH; Format = RGBA16F; };
texture GM_SSRResTex  { Width = GM_HW; Height = GM_HH; Format = RGBA16F; };
texture GM_SSRHistTex { Width = GM_HW; Height = GM_HH; Format = RGBA16F; };
GM_LINEAR_SAMPLER(sGM_SSR, GM_SSRTex);
GM_POINT_SAMPLER(sGM_SSRPoint, GM_SSRTex);
GM_POINT_SAMPLER(sGM_SSRRes, GM_SSRResTex);
GM_LINEAR_SAMPLER(sGM_SSRResLin, GM_SSRResTex);
GM_POINT_SAMPLER(sGM_SSRHist, GM_SSRHistTex);

// bloom pyramid: B = downsample chain, U = upsample/accumulate chain.
// rgb = thresholded energy, a = plain perceptual luma (multi-scale local mean for clarity)
texture GM_B1Tex { Width = BUFFER_WIDTH / 4;   Height = BUFFER_HEIGHT / 4;   Format = RGBA16F; };
texture GM_B2Tex { Width = BUFFER_WIDTH / 8;   Height = BUFFER_HEIGHT / 8;   Format = RGBA16F; };
texture GM_B3Tex { Width = BUFFER_WIDTH / 16;  Height = BUFFER_HEIGHT / 16;  Format = RGBA16F; };
texture GM_B4Tex { Width = BUFFER_WIDTH / 32;  Height = BUFFER_HEIGHT / 32;  Format = RGBA16F; };
texture GM_B5Tex { Width = BUFFER_WIDTH / 64;  Height = BUFFER_HEIGHT / 64;  Format = RGBA16F; };
texture GM_B6Tex { Width = BUFFER_WIDTH / 128; Height = BUFFER_HEIGHT / 128; Format = RGBA16F; };
texture GM_U1Tex { Width = BUFFER_WIDTH / 4;   Height = BUFFER_HEIGHT / 4;   Format = RGBA16F; };
texture GM_U2Tex { Width = BUFFER_WIDTH / 8;   Height = BUFFER_HEIGHT / 8;   Format = RGBA16F; };
texture GM_U3Tex { Width = BUFFER_WIDTH / 16;  Height = BUFFER_HEIGHT / 16;  Format = RGBA16F; };
texture GM_U4Tex { Width = BUFFER_WIDTH / 32;  Height = BUFFER_HEIGHT / 32;  Format = RGBA16F; };
texture GM_U5Tex { Width = BUFFER_WIDTH / 64;  Height = BUFFER_HEIGHT / 64;  Format = RGBA16F; };
GM_LINEAR_SAMPLER(sGM_B1, GM_B1Tex);
GM_LINEAR_SAMPLER(sGM_B2, GM_B2Tex);
GM_LINEAR_SAMPLER(sGM_B3, GM_B3Tex);
GM_LINEAR_SAMPLER(sGM_B4, GM_B4Tex);
GM_LINEAR_SAMPLER(sGM_B5, GM_B5Tex);
GM_LINEAR_SAMPLER(sGM_B6, GM_B6Tex);
GM_LINEAR_SAMPLER(sGM_U1, GM_U1Tex);
GM_LINEAR_SAMPLER(sGM_U2, GM_U2Tex);
GM_LINEAR_SAMPLER(sGM_U3, GM_U3Tex);
GM_LINEAR_SAMPLER(sGM_U4, GM_U4Tex);
GM_LINEAR_SAMPLER(sGM_U5, GM_U5Tex);

/*=============================================================================
    Shared functions
=============================================================================*/

static const float2 GM_PX  = float2(BUFFER_RCP_WIDTH, BUFFER_RCP_HEIGHT);
static const float2 GM_HPX = float2(1.0 / GM_HW, 1.0 / GM_HH);
static const float2 GM_QPX = float2(1.0 / GM_QW, 1.0 / GM_QH);
static const float GM_STENCIL = 1.5 / 266.0;   // ~1.5 texels of the Unishade depth estimate
// resolution-independent analysis unit (1/320 of the width, square in pixels) and the
// colour-mip bias that keeps the analysed frequency band constant across resolutions
static const float2 GM_UNIT = float2(1.0 / 320.0, (1.0 / 320.0) * BUFFER_WIDTH / BUFFER_HEIGHT);
float MipBias() { return max(log2(BUFFER_WIDTH / 1280.0), 0.0); }

float LinStep(float a, float b, float x) { return saturate((x - a) / max(b - a, 1e-5)); }
float SStep(float a, float b, float x)   { float t = LinStep(a, b, x); return t * t * (3.0 - 2.0 * t); }
float SoftLimit(float x, float lim)       { return x / (1.0 + abs(x) / max(lim, 1e-4)); }

float4 Stats(int i)     { return tex2Dlod(sGM_Stats, float4((i + 0.5) / 6.0, 0.5, 0, 0)); }
float4 StatsHist(int i) { return tex2Dlod(sGM_StatsHist, float4((i + 0.5) / 6.0, 0.5, 0, 0)); }

float ExpK() { return GM_Expansion; }

int SSRSteps()  { return GM_Quality == 0 ? 12 : (GM_Quality == 1 ? 20 : 32); }
int AODirs()    { return GM_Quality == 0 ? 4  : (GM_Quality == 1 ? 6  : 8);  }
int SnapTaps()  { return GM_Quality == 0 ? 8  : (GM_Quality == 1 ? 12 : 16); }

// ---- depth -------------------------------------------------------------
float RawDepthInput(float2 uv)
{
    float d;
    if (GM_DepthMode == 0)
    {
        d = ReShade::GetLinearizedDepth(uv);
    }
    else
    {
        float2 tc = uv;
#if RESHADE_DEPTH_INPUT_IS_UPSIDE_DOWN
        tc.y = 1.0 - tc.y;
#endif
#if RESHADE_DEPTH_INPUT_IS_MIRRORED
        tc.x = 1.0 - tc.x;
#endif
        d = tex2Dlod(ReShade::DepthBuffer, float4(tc, 0, 0)).x;
        if (GM_DepthMode == 2) d = 1.0 - d;
    }
    return GM::SafeF(d, 1.0);
}

// polarity-corrected depth: 0 = near, 1 = far / sky
float SceneDepth(float2 uv)
{
    float d = RawDepthInput(uv);
    return Stats(0).x < 0.0 ? 1.0 - d : d;
}

float DepthS(float2 uv) { return tex2Dlod(sGM_DepthS, float4(uv, 0, 0)).x; }

// Scale-free view depth; the global scale of estimated depth cancels out in
// every projective operation below, so only the shape matters.
// resp > 0: buffer is linear depth.  resp < 0: buffer is disparity-like
// (d = 1 - c/z, what an inverse-depth estimator normalised to 0..1 gives).
float ZFromD(float d, float resp)
{
    d = saturate(d);
    return resp > 0.0 ? d + 5e-4 : 1.0 / (1.0 + 1e-3 - d);
}

float DepthResp() { return Stats(4).x; }

// 0..1 "how far" measure normalised by the scene's own log-depth statistics,
// so haze and distance fades work whatever the depth encoding is.
float DistT(float d, float resp)
{
    float4 st = Stats(4);
    float lz = log(ZFromD(d, resp));
    return saturate((lz - (st.z - st.w)) / max(3.0 * st.w, 0.05));
}

float2 TanHalf()
{
    float t = tan(radians(GM_FOV) * 0.5);
    return float2(t * BUFFER_ASPECT_RATIO, t);
}

float3 UVToView(float2 uv, float z, float2 th)
{
    return float3((uv.x * 2.0 - 1.0) * th.x * z, (1.0 - uv.y * 2.0) * th.y * z, z);
}

float2 ViewToUV(float3 p, float2 th)
{
    float2 n = p.xy / (max(p.z, 1e-4) * th);
    return float2(n.x * 0.5 + 0.5, 0.5 - n.y * 0.5);
}

// side weight for the colour-guided one-sided stencil
float SideWeight(float l1, float l2, float l0, float d1, float d2, float d0)
{
    float a = (l1 - l0) * 14.0, b = (l2 - l0) * 14.0;
    float dz = abs(d2 - d0) / (d0 + 0.02);                 // also avoid stepping over depth jumps
    return exp(-(a * a + b * b)) * exp(-dz * dz * 16.0) + 1e-3;
}

float TopBand(float2 uv)
{
    if (GM_UI_TopBar <= 0.0) return 0.0;
    return 1.0 - SStep(GM_UI_TopBar * 0.7, GM_UI_TopBar, uv.y);
}

float ThresholdHDR()
{
    float t = GM_Bloom_Threshold;
    return t / max(1.0 - ExpK() * t, 0.02);
}

float BloomW(int level) // level 1..6
{
    return exp2(-(level - 1) * (1.0 - GM_Bloom_Radius) * 1.25);
}

float BloomWSum()
{
    return BloomW(1) + BloomW(2) + BloomW(3) + BloomW(4) + BloomW(5) + BloomW(6);
}

float3 EnvColor(float3 R, float exitX)
{
    float3 sky  = Stats(1).rgb;
    float3 top  = Stats(2).rgb;
    float3 col  = tex2Dlod(sGM_ColorH, float4(saturate(exitX), 0.06, 0, 5)).rgb;
    float up    = saturate(R.y * 1.5 + 0.3);
    return lerp(lerp(sky, col, 0.35), top, up * 0.35);
}

/*=============================================================================
    Pass 1 - input linearization (half res)
=============================================================================*/

// UI likelihood from a small sRGB neighbourhood: high-contrast near-white
// achromatic strokes (text, icons) or perfectly flat near-white panels.
float UILikeness(float3 c, float mn, float mx, float sky)
{
    float range = mx - mn;
    float sat = GM::Sat(c);
    float textLike = SStep(0.30, 0.55, range) * SStep(0.75, 0.92, mx) * (1.0 - SStep(0.2, 0.45, sat));
    float flatW = SStep(0.90, 0.97, mn) * (1.0 - SStep(0.5 / 255.0, 2.0 / 255.0, range)) * (1.0 - SStep(0.04, 0.12, sat)) * 0.9;
    return max(textLike, flatW * (1.0 - sky));   // a flat white sky (clipped sun) is not UI
}

void PS_Prep(float4 vpos : SV_Position, float2 uv : TEXCOORD, out float4 oColor : SV_Target0, out float oUI : SV_Target1)
{
    // the four full-res pixels under this half-res texel (exact centres)
    float3 p0 = tex2Dlod(ReShade::BackBuffer, float4(uv + GM_PX * float2(-0.5, -0.5), 0, 0)).rgb;
    float3 p1 = tex2Dlod(ReShade::BackBuffer, float4(uv + GM_PX * float2( 0.5, -0.5), 0, 0)).rgb;
    float3 p2 = tex2Dlod(ReShade::BackBuffer, float4(uv + GM_PX * float2(-0.5,  0.5), 0, 0)).rgb;
    float3 p3 = tex2Dlod(ReShade::BackBuffer, float4(uv + GM_PX * float2( 0.5,  0.5), 0, 0)).rgb;
    float3 c = (p0 + p1 + p2 + p3) * 0.25;
    float3 hdr = GM::Expand(GM::SRGBToLinear(c), ExpK());
    oColor = float4(GM::Safe3(hdr, 64.0), GM::Luma(saturate(c)));

    oUI = 0.0;   // the top band is applied separately wherever it is needed
    if (GM_UI_TextDetect && GM_UI_Protect > 0.0)
    {
        float l0 = GM::Luma(p0), l1 = GM::Luma(p1), l2 = GM::Luma(p2), l3 = GM::Luma(p3);
        float mn = min(min(l0, l1), min(l2, l3));
        float mx = max(max(l0, l1), max(l2, l3));
        float sky = SceneDepth(uv) >= GM_SkyDepth ? 1.0 : 0.0;
        oUI = UILikeness(c, mn, mx, sky);
    }
}

/*=============================================================================
    Pass 2/3 - scene statistics (4x1) and history copy
=============================================================================*/

float4 PS_Stats(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    int id = int(vpos.x);
    float4 prev = tex2Dlod(sGM_StatsHist, float4(uv, 0, 0));
    float a = 1.0 - exp(-max(GM_FrameTime, 0.5) / 400.0);  // ~0.4 s time constant
    a = lerp(a, 0.5, saturate(StatsHist(3).a * 12.0));      // scene cut / fast pan: adapt within a few frames
    bool first = prev.w <= 0.0;
    float polarity = StatsHist(0).x; // last frame's state

    if (id == 0)
    {
        float state = (prev.x < 0.0) ? -1.0 : 1.0;
        float top = 0.0, bot = 0.0;
        [unroll] for (int i = 0; i < 8; i++)
        {
            float x = (i + 0.5) / 8.0;
            top += RawDepthInput(float2(x, 0.08)) + RawDepthInput(float2(x, 0.2));
            bot += RawDepthInput(float2(x, 0.92)) + RawDepthInput(float2(x, 0.8));
        }
        float score = (top - bot) / 16.0;                   // > 0 : top of screen is farther
        float sm = lerp(prev.y, clamp(score * 8.0, -1.0, 1.0), 0.1);
        if (GM_DepthPolarity == 1)      state = 1.0;
        else if (GM_DepthPolarity == 2) state = -1.0;
        else
        {
            if (sm >  0.3) state =  1.0;
            if (sm < -0.3) state = -1.0;
        }

        float sky = 0.0, lum = 0.0;
        [unroll] for (int j = 0; j < 6; j++)
        [unroll] for (int k = 0; k < 8; k++)
        {
            float2 p = float2((k + 0.5) / 8.0, (j + 0.5) / 6.0);
            float d = RawDepthInput(p);
            d = state > 0.0 ? d : 1.0 - d;
            sky += d >= GM_SkyDepth ? 1.0 : 0.0;
            lum += tex2Dlod(sGM_ColorH, float4(p, 0, 3)).a;
        }
        sky /= 48.0;
        lum /= 48.0;
        float w0 = first ? 1.0 : a;
        return float4(state, sm, lerp(prev.z, sky, w0), max(lerp(prev.w, lum, w0), 1e-4));
    }

    float w = first ? 1.0 : a;

    if (id == 4) // depth response vote + log-depth statistics (uses last frame's geometry)
    {
        float state = StatsHist(4).x;
        if (state == 0.0) state = 1.0;
        float vote = 0.0, vw = 0.0, m1 = 0.0, m2 = 0.0, n = 0.0;
        [unroll] for (int j = 0; j < 8; j++)
        [unroll] for (int k = 0; k < 12; k++)
        {
            float2 p = float2((k + 0.5) / 12.0, (j + 0.5) / 8.0);
            float4 cq = tex2Dlod(sGM_CompQ, float4(p, 0, 0));
            bool confident = abs(cq.w) > 0.15;            // majority vote among confident pixels
            vote += confident ? sign(cq.w) : 0.0;
            vw += confident ? 1.0 : 0.0;
            if (cq.x < GM_SkyDepth)
            {
                float lz = log(ZFromD(cq.x, state));
                m1 += lz;
                m2 += lz * lz;
                n += 1.0;
            }
        }
        float score = vw > 4.0 ? vote / vw : 0.0;
        float sm = lerp(StatsHist(4).y, score, 0.08);
        if (GM_DepthResponse == 1)      state = 1.0;
        else if (GM_DepthResponse == 2) state = -1.0;
        else
        {
            if (sm >  0.2) state =  1.0;
            if (sm < -0.2) state = -1.0;
        }
        m1 /= max(n, 1.0);
        float sig = sqrt(max(m2 / max(n, 1.0) - m1 * m1, 1e-4));
        float4 prv = StatsHist(4);
        // (re)initialise on start-up, on a response switch, or while history is degenerate
        bool reset = prv.w < 0.02 || prv.x != state;
        float ad = 1.0 - exp(-max(GM_FrameTime, 0.5) / 200.0);
        if (n < 4.0) return float4(state, sm, prv.z, prv.w);
        return float4(state, sm, reset ? m1 : lerp(prv.z, m1, ad), reset ? sig : lerp(prv.w, sig, ad));
    }

    if (id == 5) // frame-wide floor plane normal from last frame's geometry
    {
        float2 nxy = 0.0;
        float wsum = 0.0;
        [unroll] for (int j = 0; j < 8; j++)
        [unroll] for (int k = 0; k < 12; k++)
        {
            float2 p = float2((k + 0.5) / 12.0, 0.3 + (j + 0.5) / 8.0 * 0.7);
            float4 g = tex2Dlod(sGM_GeoQ, float4(p, 0, 0));
            float4 g2 = tex2Dlod(sGM_Geo2Q, float4(p, 0, 0));
            float wt = g2.w * g2.w * g2.z;
            nxy += g.xy * wt;
            wsum += wt;
        }
        float conf = saturate(wsum / 12.0);
        float ny = wsum > 1e-3 ? clamp(nxy.y / wsum, 0.2, 1.0) : 0.9;
        float3 nf = float3(0.0, ny, -sqrt(saturate(1.0 - ny * ny)));   // Roblox cameras do not roll
        float4 prv = StatsHist(5);
        float4 cur = float4(nf, conf);
        // a clearly different plane (polarity/response switch, teleport) re-converges fast
        float af = (conf > 0.5 && dot(prv.xyz, nf) < 0.97) ? 0.3 : a;
        float4 res = (first || prv.w <= 0.0) ? cur : lerp(prv, cur, af);
        res.xyz = normalize(res.xyz + float3(0.0, 1e-4, 0.0));
        return res;
    }

    float3 acc = 0.0;
    float wsum = 0.0;
    if (id == 1) // sky colour: average of sky-classified samples
    {
        [unroll] for (int j = 0; j < 6; j++)
        [unroll] for (int k = 0; k < 8; k++)
        {
            float2 p = float2((k + 0.5) / 8.0, (j + 0.5) / 6.0 * 0.8);
            float d = RawDepthInput(p);
            d = polarity >= 0.0 ? d : 1.0 - d;
            float sw = d >= GM_SkyDepth ? 1.0 : 0.0;
            acc += tex2Dlod(sGM_ColorH, float4(p, 0, 3)).rgb * sw;
            wsum += sw;
        }
        if (wsum < 0.5) // no sky visible: fall back to the top band
        {
            [unroll] for (int k = 0; k < 8; k++)
            {
                acc += tex2Dlod(sGM_ColorH, float4((k + 0.5) / 8.0, 0.08, 0, 4)).rgb;
                wsum += 1.0;
            }
        }
    }
    else if (id == 2) // top band colour
    {
        [unroll] for (int k = 0; k < 8; k++)
        {
            acc += tex2Dlod(sGM_ColorH, float4((k + 0.5) / 8.0, 0.05, 0, 4)).rgb;
            acc += tex2Dlod(sGM_ColorH, float4((k + 0.5) / 8.0, 0.15, 0, 4)).rgb;
            wsum += 2.0;
        }
    }
    else // id == 3: mean scene colour + global motion (static camera detection)
    {
        float motion = 0.0;
        [unroll] for (int j = 0; j < 6; j++)
        [unroll] for (int k = 0; k < 8; k++)
        {
            float2 p = float2((k + 0.5) / 8.0, (j + 0.5) / 6.0);
            float4 c = tex2Dlod(sGM_ColorH, float4(p, 0, 4));
            acc += c.rgb;
            wsum += 1.0;
            motion += abs(c.a - tex2Dlod(sGM_PrevSmall, float4(p, 0, 0)).x);
        }
        motion /= 48.0;
        float3 cur3 = acc / max(wsum, 1e-3);
        // fast attack, slower release: one moving frame wakes the jitter up immediately
        float m = max(motion, lerp(prev.a, motion, 0.3));
        float wc = dot(prev.rgb, 1.0) <= 0.0 ? 1.0 : a;
        return float4(GM::Safe3(lerp(prev.rgb, cur3, wc), 64.0), m);
    }
    float3 cur = acc / max(wsum, 1e-3);
    return float4(GM::Safe3(lerp(prev.rgb, cur, w), 64.0), 1.0);
}

float4 PS_StatsCopy(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    return tex2Dlod(sGM_Stats, float4(uv, 0, 0));
}

float PS_SmallCopy(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    return tex2Dlod(sGM_ColorH, float4(uv, 0, 4)).a;
}

// 1 while the camera and scene are (globally) still
float IsStatic() { return 1.0 - SStep(0.002, 0.006, Stats(3).a); }

/*=============================================================================
    Pass 4/5 - depth conditioning + bloom prefilter (quarter res, MRT)
=============================================================================*/

float4 BloomPrefilter(float2 uv)
{
    float2 hp = GM_HPX;
    // the four half-res texels under this quarter-res pixel (exact centres)
    float4 t0 = tex2Dlod(sGM_ColorH, float4(uv + hp * float2(-0.5, -0.5), 0, 0));
    float4 t1 = tex2Dlod(sGM_ColorH, float4(uv + hp * float2( 0.5, -0.5), 0, 0));
    float4 t2 = tex2Dlod(sGM_ColorH, float4(uv + hp * float2(-0.5,  0.5), 0, 0));
    float4 t3 = tex2Dlod(sGM_ColorH, float4(uv + hp * float2( 0.5,  0.5), 0, 0));
    // outer diagonal ring for the erosion (min) test
    float o0 = GM::Luma(tex2Dlod(sGM_ColorH, float4(uv + hp * float2(-1.5, -1.5), 0, 0)).rgb);
    float o1 = GM::Luma(tex2Dlod(sGM_ColorH, float4(uv + hp * float2( 1.5, -1.5), 0, 0)).rgb);
    float o2 = GM::Luma(tex2Dlod(sGM_ColorH, float4(uv + hp * float2(-1.5,  1.5), 0, 0)).rgb);
    float o3 = GM::Luma(tex2Dlod(sGM_ColorH, float4(uv + hp * float2( 1.5,  1.5), 0, 0)).rgb);

    float l0 = GM::Luma(t0.rgb), l1 = GM::Luma(t1.rgb), l2 = GM::Luma(t2.rgb), l3 = GM::Luma(t3.rgb);
    // Karis average: suppresses single-pixel fireflies
    float w0 = 1.0 / (1.0 + l0), w1 = 1.0 / (1.0 + l1), w2 = 1.0 / (1.0 + l2), w3 = 1.0 / (1.0 + l3);
    float3 avg = (t0.rgb * w0 + t1.rgb * w1 + t2.rgb * w2 + t3.rgb * w3) / (w0 + w1 + w2 + w3);
    float lAvg = GM::Luma(avg);

    float lMin = min(min(min(l0, l1), min(l2, l3)), min(min(o0, o1), min(o2, o3)));
    float erosion = saturate(lMin / max(lAvg, 1e-4));
    erosion = lerp(1.0, erosion * erosion, GM_Bloom_TextReject);

    // threshold on the brightest channel, not luminance: Roblox Neon parts are
    // fully saturated (pink, cyan) and their luminance never reaches a white threshold
    float T = ThresholdHDR();
    float bright = GM::Max3(avg);
    float e = GM::SoftKnee(bright, T, GM_Bloom_Knee * T) / max(bright, 1e-4);
    float ui = saturate(max(TopBand(uv), tex2Dlod(sGM_UIH, float4(uv, 0, 0)).x)) * GM_UI_Protect;
    float3 b = avg * e * erosion * (1.0 - ui);

    float plainL = (t0.a + t1.a + t2.a + t3.a) * 0.25;
    return float4(GM::Safe3(b, 64.0), saturate(plainL));
}

void PS_DepthQ(float4 vpos : SV_Position, float2 uv : TEXCOORD, out float2 oDepth : SV_Target0, out float4 oBloom : SV_Target1)
{
    float d = SceneDepth(uv);
    float h = tex2Dlod(sGM_DepthQHist, float4(uv, 0, 0)).x;
    float tol = 0.02 * (d + 0.05);
    float k = GM_DepthTemporal * (1.0 - SStep(tol, 3.0 * tol, abs(d - h)));
    d = lerp(d, h, k);
    float L = tex2Dlod(sGM_ColorH, float4(uv, 0, 0)).a;
    oDepth = float2(GM::SafeF(d, 1.0), L);
    oBloom = BloomPrefilter(uv);
}

float PS_DepthQCopy(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    return tex2Dlod(sGM_DepthQPoint, float4(uv, 0, 0)).x;
}

/*=============================================================================
    Pass 6 - colour-guided depth edge snapping (quarter res)
    The estimate is ~266x154, so object borders are ~2 depth texels wide and
    do not line up with the real edges. Only where depth actually has an edge
    do we re-average it over neighbours with matching colour.
=============================================================================*/

float2 PS_DepthFilter(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    float2 c = tex2Dlod(sGM_DepthQPoint, float4(uv, 0, 0)).xy;
    if (GM_DepthEdgeSnap <= 0.0) return c;

    int n = SnapTaps();
    float sum = c.x, wsum = 1.0;
    float dmin = c.x, dmax = c.x;
    [loop] for (int i = 0; i < n; i++)
    {
        float r = sqrt((i + 0.5) / n) * 5.0;
        float ang = i * 2.3999632;
        float2 o = float2(cos(ang), sin(ang)) * r * GM_UNIT;
        float2 s = tex2Dlod(sGM_DepthQ, float4(uv + o, 0, 0)).xy;
        float dl = (s.y - c.y) * 20.0;
        float w = exp(-dl * dl) * exp(-r * r * 0.08);
        sum += s.x * w;
        wsum += w;
        dmin = min(dmin, s.x);
        dmax = max(dmax, s.x);
    }
    float snapped = sum / wsum;
    float edge = SStep(0.03, 0.08, (dmax - dmin) / (c.x + 0.05));
    return float2(GM::SafeF(lerp(c.x, snapped, edge * GM_DepthEdgeSnap), 1.0), c.y);
}

/*=============================================================================
    Pass 7 - geometry: smoothed normals, planarity, gloss, water, AO (quarter res)
=============================================================================*/

void PS_Geometry(float4 vpos : SV_Position, float2 uv : TEXCOORD,
                 out float4 oGeo : SV_Target0, out float4 oGeo2 : SV_Target1, out float4 oComp : SV_Target2)
{
    float d0 = DepthS(uv);
    float guideL = tex2Dlod(sGM_DepthQPoint, float4(uv, 0, 0)).y;
    oComp = float4(d0, guideL, 1.0, 0.0);
    if (d0 >= GM_SkyDepth)
    {
        oGeo  = float4(0.0, 0.0, 0.0, 1.0);
        oGeo2 = float4(1.0, 0.0, 0.0, 0.0);
        return;
    }

    float2 th = TanHalf();
    float resp = DepthResp();
    float z0 = ZFromD(d0, resp);
    float q0 = 1.0 / z0;
    float3 P0 = UVToView(uv, z0, th);

    // Stencil sized in depth-estimate texels (~1.5 texels of a 266-wide estimate),
    // so it is resolution independent and wider than the estimator's noise.
    float2 k1 = float2(GM_STENCIL, GM_STENCIL * BUFFER_ASPECT_RATIO);
    float2 xp1 = tex2Dlod(sGM_DepthS, float4(uv + float2(k1.x, 0.0), 0, 0)).xy;
    float2 xp2 = tex2Dlod(sGM_DepthS, float4(uv + float2(2.0 * k1.x, 0.0), 0, 0)).xy;
    float2 xm1 = tex2Dlod(sGM_DepthS, float4(uv - float2(k1.x, 0.0), 0, 0)).xy;
    float2 xm2 = tex2Dlod(sGM_DepthS, float4(uv - float2(2.0 * k1.x, 0.0), 0, 0)).xy;
    float2 yp1 = tex2Dlod(sGM_DepthS, float4(uv + float2(0.0, k1.y), 0, 0)).xy;
    float2 yp2 = tex2Dlod(sGM_DepthS, float4(uv + float2(0.0, 2.0 * k1.y), 0, 0)).xy;
    float2 ym1 = tex2Dlod(sGM_DepthS, float4(uv - float2(0.0, k1.y), 0, 0)).xy;
    float2 ym2 = tex2Dlod(sGM_DepthS, float4(uv - float2(0.0, 2.0 * k1.y), 0, 0)).xy;

    // one-sided stencils chosen by colour similarity: a floor pixel next to a
    // wall only uses floor samples, so creases do not bend its normal
    float wxp = SideWeight(xp1.y, xp2.y, guideL, xp1.x, xp2.x, d0);
    float wxm = SideWeight(xm1.y, xm2.y, guideL, xm1.x, xm2.x, d0);
    float wyp = SideWeight(yp1.y, yp2.y, guideL, yp1.x, yp2.x, d0);
    float wym = SideWeight(ym1.y, ym2.y, guideL, ym1.x, ym2.x, d0);
    float qxp1 = 1.0 / ZFromD(xp1.x, resp), qxp2 = 1.0 / ZFromD(xp2.x, resp), qxm1 = 1.0 / ZFromD(xm1.x, resp), qxm2 = 1.0 / ZFromD(xm2.x, resp);
    float qyp1 = 1.0 / ZFromD(yp1.x, resp), qyp2 = 1.0 / ZFromD(yp2.x, resp), qym1 = 1.0 / ZFromD(ym1.x, resp), qym2 = 1.0 / ZFromD(ym2.x, resp);

    // inverse depth is affine on a plane: its slope gives the exact plane normal,
    // its one-sided second difference measures planarity (both scale-free)
    float gxp = 0.5 * ((qxp1 - q0) + 0.5 * (qxp2 - q0)), gxm = 0.5 * ((q0 - qxm1) + 0.5 * (q0 - qxm2));
    float gyp = 0.5 * ((qyp1 - q0) + 0.5 * (qyp2 - q0)), gym = 0.5 * ((q0 - qym1) + 0.5 * (q0 - qym2));
    float gx = (gxp * wxp + gxm * wxm) / ((wxp + wxm) * k1.x);    // dq/du
    float gy = (gyp * wyp + gym * wym) / ((wyp + wym) * k1.y);    // dq/dv
    float cx = (abs(qxp2 - 2.0 * qxp1 + q0) * wxp + abs(qxm2 - 2.0 * qxm1 + q0) * wxm) / (wxp + wxm);
    float cy = (abs(qyp2 - 2.0 * qyp1 + q0) * wyp + abs(qym2 - 2.0 * qym1 + q0) * wym) / (wyp + wym);

    float qx = gx / (2.0 * th.x);          // d q / d x'   (x' = view-plane x)
    float qy = -gy / (2.0 * th.y);         // d q / d y'
    float2 xy = float2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0) * th;
    float3 N = float3(qx, qy, q0 - xy.x * qx - xy.y * qy);
    float nl = length(N);
    N = nl > 1e-12 ? N / nl : float3(0.0, 0.0, -1.0);
    if (dot(N, P0) > 0.0) N = -N;

    float curv = (cx + cy) / q0;
    float planar = 1.0 - SStep(0.006, 0.04, curv);
    float nearSky = max(max(max(xp2.x, xm2.x), max(yp2.x, ym2.x)), max(max(xp1.x, xm1.x), max(yp1.x, ym1.x)));
    planar *= 1.0 - SStep(GM_SkyDepth - 0.03, GM_SkyDepth, nearSky);

    // depth-response vote: would the other reading of the buffer be more planar here?
    {
        float ro = -resp;
        float o0 = 1.0 / ZFromD(d0, ro);
        float oxp1 = 1.0 / ZFromD(xp1.x, ro), oxp2 = 1.0 / ZFromD(xp2.x, ro), oxm1 = 1.0 / ZFromD(xm1.x, ro), oxm2 = 1.0 / ZFromD(xm2.x, ro);
        float oyp1 = 1.0 / ZFromD(yp1.x, ro), oyp2 = 1.0 / ZFromD(yp2.x, ro), oym1 = 1.0 / ZFromD(ym1.x, ro), oym2 = 1.0 / ZFromD(ym2.x, ro);
        float ocx = (abs(oxp2 - 2.0 * oxp1 + o0) * wxp + abs(oxm2 - 2.0 * oxm1 + o0) * wxm) / (wxp + wxm);
        float ocy = (abs(oyp2 - 2.0 * oyp1 + o0) * wyp + abs(oym2 - 2.0 * oym1 + o0) * wym) / (wyp + wym);
        // normalise by the local slope so both readings are compared fairly
        float sCur = (cx + cy) / (abs(qxp2 - qxm2) + abs(qyp2 - qym2) + 1e-6 * q0);
        float sOth = (ocx + ocy) / (abs(oxp2 - oxm2) + abs(oyp2 - oym2) + 1e-6 * o0);
        float slopeOk = SStep(0.002, 0.01, (abs(qyp2 - qym2) + abs(qxp2 - qxm2)) / q0);  // needs a gradient to judge
        float conf = saturate(abs(sCur - sOth) / (sCur + sOth + 1e-6)) * slopeOk * (1.0 - SStep(0.2, 0.6, min(sCur, sOth)));
        float linWins = (resp > 0.0) == (sCur < sOth) ? 1.0 : -1.0;
        oComp.w = linWins * conf;
    }

    float floorness = SStep(GM_SSR_FloorMin, GM_SSR_FloorMin + 0.3, N.y);
    // must also agree with the frame-wide floor plane: depth blur at silhouettes
    // produces steep fake 'ramps' whose normals disagree by far more than noise
    float4 fp = Stats(5);
    float agree = SStep(0.80, 0.93, dot(N, fp.xyz));
    // ...and its inverse-depth slope must match what that plane predicts here
    // (a blurred silhouette ramp is many times steeper than any floor)
    float qyPred = fp.y / min(dot(fp.xyz, P0), -1e-6);
    float slopeRatio = qy / qyPred;
    float slopeOk = SStep(0.25, 0.45, slopeRatio) * (1.0 - SStep(2.5, 4.0, slopeRatio));
    floorness *= lerp(1.0, agree * slopeOk, fp.w);

    // texture busyness: relative luma variance on each of four sides (Kuwahara
    // style) at three scales; the calmest side wins, so a floor pixel next to a
    // high-contrast edge is not mistaken for a rough texture. The wide scale sees
    // sparse patterns (stud rings, tile seams) that look flat up close.
    float relSigma = 1e3;
    float GM_MIPBIAS = MipBias();
    [unroll] for (int sd = 0; sd < 4; sd++)
    {
        float2 ax = sd == 0 ? float2(1, 0) : (sd == 1 ? float2(-1, 0) : (sd == 2 ? float2(0, 1) : float2(0, -1)));
        float2 pr = float2(-ax.y, ax.x);
        float m1 = 0.0, m2 = 0.0, c1 = 0.0, c2 = 0.0, w1 = 0.0, w2 = 0.0;
        [unroll] for (int k = 0; k < 4; k++)
        {
            float2 off = ax * (1.0 + (k >> 1)) + pr * ((k & 1) ? 0.75 : -0.75);
            float l  = tex2Dlod(sGM_ColorH, float4(uv + off * GM_UNIT, 0, GM_MIPBIAS)).a;
            float lc = tex2Dlod(sGM_ColorH, float4(uv + off * GM_UNIT * 3.0, 0, GM_MIPBIAS + 1.0)).a;
            float lw = tex2Dlod(sGM_ColorH, float4(uv + off * GM_UNIT * 8.0, 0, GM_MIPBIAS + 1.0)).a;
            m1 += l;  m2 += l * l;
            c1 += lc; c2 += lc * lc;
            w1 += lw; w2 += lw * lw;
        }
        m1 *= 0.25; m2 *= 0.25; c1 *= 0.25; c2 *= 0.25; w1 *= 0.25; w2 *= 0.25;
        float rs = max(sqrt(max(m2 - m1 * m1, 0.0)) / (m1 + 0.03),
                   max(sqrt(max(c2 - c1 * c1, 0.0)) / (c1 + 0.03) * 0.8,
                       sqrt(max(w2 - w1 * w1, 0.0)) / (w1 + 0.03) * 0.6));
        relSigma = min(relSigma, rs);
    }
    // measured: flat plastic <= 0.002, grass 0.015-0.035, studs ~0.04
    float texRough = SStep(0.004, 0.015, relSigma);

    // water: blue/teal, saturated, floor-oriented
    float3 cc = tex2Dlod(sGM_ColorH, float4(uv, 0, 0)).rgb;
    float hueW = abs(GM::Hue(cc) - 0.5);                   // Roblox water is teal/cyan (hue ~0.5)
    float teal = 1.0 - SStep(0.05, 0.09, hueW);
    float water = teal * SStep(0.3, 0.5, GM::Sat(cc)) * SStep(0.02, 0.05, GM::Luma(cc)) * SStep(0.3, 0.6, N.y) * step(0.001, GM_SSR_Water);

    float gloss = saturate(GM_SSR_Gloss * lerp(1.0, 1.0 - texRough, GM_SSR_TexGloss));
    gloss = lerp(gloss, max(gloss, 0.92), water);
    float receiver = lerp(GM_SSR_Vertical, 1.0, floorness);
    // half-rough surfaces would only show blurry dark smudges: fade them out fast
    float refl = planar * receiver * gloss * SStep(0.3, 0.7, gloss);
    refl = max(refl, water * GM_SSR_Water * SStep(0.1, 0.5, planar));
    refl *= 1.0 - SStep(GM_SkyDepth - 0.05, GM_SkyDepth, d0);

    // ---- ambient occlusion (normal-oriented, relative-depth falloff = no halos)
    float ao = 1.0;
    if (GM_AO_Enable)
    {
        int dirs = AODirs();
        float3 Nao = normalize(lerp(N, fp.xyz, floorness * fp.w));
        int2 ip = int2(vpos.xy) & 1;
        float rot = (ip.x * 2 + ip.y) * 0.25;               // 2x2 interleave, resolved by the upsampler
        float rad = GM_AO_Radius * 0.02 * lerp(1.0, 0.35, DistT(d0, resp));
        float2 rUV = float2(rad / BUFFER_ASPECT_RATIO, rad);
        float occ = 0.0;
        [loop] for (int i = 0; i < dirs; i++)
        {
            float ang = (i + rot) * 6.2831853 / dirs;
            float2 dir = float2(cos(ang), sin(ang));
            [unroll] for (int s = 1; s <= 2; s++)
            {
                float2 suv = uv + dir * rUV * (s * 0.5 - 0.1 * rot);
                float3 Ps = UVToView(suv, ZFromD(DepthS(suv), resp), th);
                float3 v = Ps - P0;
                float len = length(v) + 1e-5;
                float fall = saturate(1.0 - len / (z0 * GM_AO_Range * 2.0));
                occ += saturate(dot(v, Nao) / len - 0.3) * fall * fall;
            }
        }
        ao = saturate(1.0 - occ / (dirs * 2.0) * 3.0);
    }

    oGeo  = float4(N.xy, saturate(refl), ao);
    oGeo2 = float4(1.0 - gloss, water, planar, floorness);
    oComp.z = ao;
}

/*=============================================================================
    Pass 8 - reflections (half res)

    Floors and water use a PLANAR CONTACT-MIRROR trace: march along the
    reflected direction until the estimated depth leaves the floor plane (the
    contact line of whatever stands on it), then mirror about that contact in
    3D. For a horizontal reflector and vertical occluders this is exact and it
    only needs the floor plane ORIENTATION (fitted over the whole frame), not
    accurate per-pixel depth or normals - which estimated depth cannot give.

    Everything else uses a stride-adaptive perspective-correct screen-space
    march with dithered start, binary-search refinement and relative thickness.

    Both paths: Schlick Fresnel, roughness-cone colour LOD, screen-edge fade,
    sky/gradient fallback on misses (never black), top-bar UI rejection.
=============================================================================*/

// Floor-plane depth (plane units, camera height 1) at a point of the march.
float PlaneZ(float2 s, float3 Nf, float2 th)
{
    return -1.0 / min(dot(Nf, UVToView(s, 1.0, th)), -1e-5);
}

// Mirror an occluder that stands on the floor. zObj = its estimated depth.
// The base is where the floor plane reaches that depth (robust to the soft,
// blurred contact in estimated depth). Returns xy = mirrored uv, z = valid.
float3 MirrorOccluder(float2 uv, float2 dir, float tHi, float zObjPl, float3 Pp, float3 Nf, float2 th)
{
    float a = 0.0, b = tHi;
    [unroll] for (int r = 0; r < 7; r++)
    {
        float m = 0.5 * (a + b);
        if (PlaneZ(uv + dir * m, Nf, th) < zObjPl) a = m; else b = m;
    }
    float3 rc = UVToView(uv + dir * b, 1.0, th);
    float dc = dot(Nf, rc);
    if (dc > -1e-4) return float3(uv, 0.0);
    float3 C = rc * (-1.0 / dc);                          // contact point on the floor plane
    float aH = length(Pp + Nf), bH = length(C + Nf);      // horizontal distances from the camera foot
    float h = max(bH - aH, 0.0) / max(aH, 1e-4);          // mirrored height (similar triangles)
    float3 Hp = C + Nf * h;
    if (Hp.z < 0.05 * C.z) return float3(uv, 0.0);
    return float3(ViewToUV(Hp, th), 1.0);
}

// Planar contact-mirror trace.
// returns xy = hit uv, z = 1 if found, w = fraction of the march used
float4 TraceFloorMirror(float2 uv, float3 Nf, float z0, float resp, float2 th, float jit, int steps)
{
    float3 rp = UVToView(uv, 1.0, th);
    float dp = dot(Nf, rp);
    if (dp > -1e-3) return float4(uv, 0.0, 1.0);
    float3 Pp = rp * (-1.0 / dp);                         // floor point, camera height = 1
    float kappa = z0 / Pp.z;                              // estimated-depth units per plane unit
    float3 R = reflect(normalize(Pp), Nf);
    float2 dir = ViewToUV(Pp + R * (Pp.z * 0.25), th) - uv;
    float dl = length(dir);
    if (dl < 1e-6) return float4(uv, 0.0, 1.0);
    dir /= dl;

    float tmax = 2.0;
    if (dir.x >  1e-5) tmax = min(tmax, (1.0 - uv.x) / dir.x);
    if (dir.x < -1e-5) tmax = min(tmax, -uv.x / dir.x);
    if (dir.y >  1e-5) tmax = min(tmax, (1.0 - uv.y) / dir.y);
    if (dir.y < -1e-5) tmax = min(tmax, -uv.y / dir.y);
    tmax = max(tmax, 1e-4);

    const float tolDetect = 0.08;   // clear departure from the floor = occluder
    const float tolStable = 0.02;   // clearly floor = update the depth scale
    float used = 1.0;
    float inside = 0.0;             // 1 while marching over an occluder too short to reflect here
    float zSkip = 0.0;
    [loop] for (int i = 0; i < steps; i++)
    {
        float f = (i + jit) / steps;
        float t = max(f * f * tmax, (i + 1) * 1.5 * GM_QPX.y);
        if (t > tmax) break;
        float2 s = uv + dir * t;
        float dn = dot(Nf, UVToView(s, 1.0, th));
        if (dn > -1e-4) { used = t / tmax; break; }      // reached the horizon: open sky
        float zPl = -1.0 / dn;
        float zs = ZFromD(DepthS(s), resp);
        float ratio = zs / (kappa * zPl);

        if (inside > 0.5)
        {
            if (zs < zSkip * 1.15) continue;              // still on the skipped occluder
            inside = 0.0;                                 // left it: floor or a farther occluder
        }
        if (ratio < 1.0 - tolDetect)
        {
            float3 m = MirrorOccluder(uv, dir, t, zs / kappa, Pp, Nf, th);
            if (m.z > 0.5)
            {
                float zh = ZFromD(DepthS(m.xy), resp);
                bool onScreen = all(m.xy > 0.0) && all(m.xy < 1.0);
                if (!onScreen || zh < zs * 1.2)           // mirrored point lies on this occluder
                    return float4(m.xy, 1.0, t / tmax);
            }
            inside = 1.0;                                 // too short: the ray passes over it
            zSkip = zs;
            continue;
        }
        if (ratio > 1.5) { used = t / tmax; break; }     // floor ends into far background
        if (abs(ratio - 1.0) < tolStable) kappa *= lerp(1.0, ratio, 0.5);   // follow estimator drift
    }
    return float4(uv, 0.0, used);
}

float4 PS_SSR(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    if (!GM_SSR_Enable) return 0.0;
    float4 geo = tex2Dlod(sGM_GeoQ, float4(uv, 0, 0));
    if (geo.z < 0.02) return 0.0;                          // early-out: sky, UI, non-receivers
    // erode the receiver mask vertically: thin strips (depth blur on box tops) never reflect
    geo.z = min(geo.z, min(tex2Dlod(sGM_GeoQ, float4(uv - float2(0.0, 1.5 * GM_QPX.y), 0, 0)).z,
                           tex2Dlod(sGM_GeoQ, float4(uv + float2(0.0, 1.5 * GM_QPX.y), 0, 0)).z));
    if (geo.z < 0.02) return 0.0;
    if (tex2Dlod(sGM_UIH, float4(uv, 0, 0)).x * GM_UI_Protect > 0.5) return 0.0;
    if (TopBand(uv) * GM_UI_Protect > 0.5) return 0.0;
    float4 g2 = tex2Dlod(sGM_Geo2Q, float4(uv, 0, 0));
    float rough = g2.x, water = g2.y;

    float2 th = TanHalf();
    float resp = DepthResp();
    float d0 = DepthS(uv);
    float z0 = ZFromD(d0, resp);
    float3 P0 = UVToView(uv, z0, th);
    float4 floorPlane = Stats(5);
    bool planarPath = floorPlane.w > 0.2 && (g2.w > 0.25 || water > 0.3) && GM_SSR_FloorSnap > 0.0;
    float3 N = GM::DecodeNormal(geo.xy);
    N = normalize(lerp(N, floorPlane.xyz, planarPath ? 1.0 : g2.w * floorPlane.w * GM_SSR_FloorSnap));

    float2 ripple = 0.0;
    if (water > 0.05 && GM_SSR_Ripple > 0.0) // wave normals from the water's own shading
    {
        float2 hp = GM_HPX * 1.5;
        float lx = tex2Dlod(sGM_ColorH, float4(uv + float2(hp.x, 0), 0, 0)).a - tex2Dlod(sGM_ColorH, float4(uv - float2(hp.x, 0), 0, 0)).a;
        float ly = tex2Dlod(sGM_ColorH, float4(uv + float2(0, hp.y), 0, 0)).a - tex2Dlod(sGM_ColorH, float4(uv - float2(0, hp.y), 0, 0)).a;
        ripple = clamp(float2(lx, ly), -0.2, 0.2) * GM_SSR_Ripple * water;
        N.x += ripple.x * 2.0;
        N.z += ripple.y * 2.0;
        N = normalize(N);
    }

    float3 V = normalize(P0);
    float3 R = reflect(V, N);
    float NoV = saturate(dot(-V, N));
    float fres = pow(1.0 - NoV, 5.0);
    float F = lerp(GM_SSR_F0 + (1.0 - GM_SSR_F0) * fres, 0.02 + 0.98 * fres, water);
    float weight = saturate(F * GM_SSR_Strength) * geo.z;
    if (!planarPath) weight *= SStep(-0.6, 0.1, R.z);       // rays towards the camera are unresolvable
    if (weight < 0.003) return 0.0;

    int steps = SSRSteps();
    // temporal jitter only while moving; a still frame uses a fixed pattern, so the
    // accumulated result converges exactly and cannot shimmer
    bool jitterOn = GM_SSR_Temporal > 0.0 && IsStatic() < 0.5;
    float jit = jitterOn ? GM::IGN(vpos.xy + float(GM_Frame % 16) * float2(5.588238, 3.1416)) : GM::IGN(vpos.xy);
    float up = saturate(R.y * 1.5 + 0.3);
    float skyVis = saturate(0.3 + Stats(0).z * 2.0);
    float envW = GM_SSR_Env * skyVis * (1.0 - rough) * (1.0 - 0.75 * water);

    bool found = false;
    float2 hs = uv;
    float travel = 0.0;
    float exitX = uv.x;

    if (planarPath)
    {
        float4 tr = TraceFloorMirror(uv, floorPlane.xyz, z0, resp, th, jit, steps);
        found = tr.z > 0.5;
        hs = tr.xy + ripple * 0.06;
        travel = tr.w;
        exitX = uv.x;
    }
    else
    {
        // generic screen-space march (non-floor glossy parts)
        float len = z0 * GM_SSR_MaxDist;
        if (R.z < 0.0) len = min(len, z0 * 0.9 / max(-R.z, 1e-3));
        float3 P1 = P0 + R * len;
        float2 dS = ViewToUV(P1, th) - uv;
        float tmax = 1.0;
        if (dS.x > 1e-6)  tmax = min(tmax, (1.0 - uv.x) / dS.x);
        if (dS.x < -1e-6) tmax = min(tmax, -uv.x / dS.x);
        if (dS.y > 1e-6)  tmax = min(tmax, (1.0 - uv.y) / dS.y);
        if (dS.y < -1e-6) tmax = min(tmax, -uv.y / dS.y);
        tmax = saturate(tmax);
        float iz0 = 1.0 / z0, iz1 = 1.0 / max(P1.z, 1e-3);
        float lenPx = length(dS * tmax * float2(GM_QW, GM_QH));
        float tmin = min(1.5 / max(lenPx, 1e-3), 0.5);
        float tPrev = 0.0, zPrev = z0, tHit = -1.0;
        [loop] for (int i = 0; i < steps; i++)
        {
            float f = (i + jit) / steps;
            float t = lerp(tmin, 1.0, f * sqrt(f)) * tmax;
            float2 s = uv + dS * t;
            float zr = 1.0 / lerp(iz0, iz1, t);
            float zs = ZFromD(DepthS(s), resp);
            float diff = zr - zs;
            float thick = GM_SSR_Thickness * zs + abs(zr - zPrev);
            if (diff > 0.002 * zs && diff < thick) { tHit = t; break; }
            tPrev = t;
            zPrev = zr;
        }
        exitX = uv.x + dS.x * tmax;
        if (tHit > 0.0)
        {
            float a = tPrev, b = tHit;
            [unroll] for (int r = 0; r < 4; r++)
            {
                float m = 0.5 * (a + b);
                float zr = 1.0 / lerp(iz0, iz1, m);
                if (zr > ZFromD(DepthS(uv + dS * m), resp)) b = m; else a = m;
            }
            hs = uv + dS * b;
            travel = b;
            found = true;
        }
    }

    float3 col;
    if (found)
    {
        float distPx = length((hs - uv) * float2(GM_HW, GM_HH));
        float lod = clamp(log2(1.0 + distPx * rough * 0.35), 0.0, 5.0);
        float3 hitCol = tex2Dlod(sGM_ColorH, float4(saturate(hs), 0, lod)).rgb;
        float2 e = min(hs, 1.0 - hs);
        float edge = SStep(0.0, GM_SSR_EdgeFade, min(e.x * BUFFER_ASPECT_RATIO, e.y));
        float uiHit = saturate(max(TopBand(hs), tex2Dlod(sGM_UIH, float4(hs, 0, 0)).x * 1.5)) * GM_UI_Protect;
        float conf = edge * (1.0 - SStep(0.8, 1.0, travel)) * (1.0 - uiHit);
        col = lerp(EnvColor(R, hs.x), hitCol, conf);
        weight *= lerp(envW, 1.0, conf);
    }
    else
    {
        col = EnvColor(R, exitX);
        weight *= envW * lerp(0.5, 1.0, up);
    }

    // trace weights on dark surfaces turn into visible blotches (the sky is ~300x
    // brighter than dark grass), so anything below a few percent is dropped
    weight *= SStep(0.01, 0.035, weight);
    return float4(GM::Safe3(col, 64.0), saturate(weight));
}

/*=============================================================================
    Pass 9/10 - reflection resolve: roughness-aware depth-weighted blur +
    temporal accumulation with variance clipping, then history copy
=============================================================================*/

float4 PS_SSRResolve(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    float4 c = tex2Dlod(sGM_SSRPoint, float4(uv, 0, 0));
    // early-out: one bilinear tap per side covers the 3x3 footprint; nothing to resolve
    float4 h0 = tex2Dlod(sGM_SSRHist, float4(uv, 0, 0));
    float any = c.a + h0.a
              + tex2Dlod(sGM_SSR, float4(uv + GM_HPX * float2(-0.75, -0.75), 0, 0)).a
              + tex2Dlod(sGM_SSR, float4(uv + GM_HPX * float2( 0.75,  0.75), 0, 0)).a;
    if (any <= 0.0) return 0.0;
    float rough = tex2Dlod(sGM_Geo2Q, float4(uv, 0, 0)).x;
    float stride = 1.0 + rough * 2.5;
    float d0 = DepthS(uv);

    float4 sum = c, m1 = c, m2 = c * c;
    float wsum = 1.0;
    [unroll] for (int y = -1; y <= 1; y++)
    [unroll] for (int x = -1; x <= 1; x++)
    {
        if (x == 0 && y == 0) continue;
        float2 o = float2(x, y) * GM_HPX * stride;
        float4 s = tex2Dlod(sGM_SSR, float4(uv + o, 0, 0));
        float ds = DepthS(uv + o);
        float w = exp(-0.5 * (x * x + y * y)) * saturate(1.0 - abs(ds - d0) / (0.03 * (d0 + 0.05)));
        sum += s * w;
        wsum += w;
        m1 += s;
        m2 += s * s;
    }
    float4 filt = sum / wsum;
    m1 /= 9.0;
    m2 /= 9.0;
    float4 sig = sqrt(max(m2 - m1 * m1, 0.0));
    float4 h = clamp(h0, m1 - 1.25 * sig, m1 + 1.25 * sig);
    float k = lerp(GM_SSR_Temporal, max(GM_SSR_Temporal, 0.9), IsStatic());
    return GM::Safe4(lerp(filt, h, k), 64.0);
}

float4 PS_SSRCopy(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    return tex2Dlod(sGM_SSRRes, float4(uv, 0, 0));
}

/*=============================================================================
    Passes 11-20 - dual-filter bloom pyramid
=============================================================================*/

// Written as macros (not functions taking a sampler) so every compiler,
// including DXC/SM6, can bind the resources statically.
#define GM_DOWN_KAWASE(s, uv, t) ((tex2Dlod(s, float4(uv, 0, 0)) * 4.0 \
    + tex2Dlod(s, float4((uv) + (t) * float2(-1.0, -1.0), 0, 0)) \
    + tex2Dlod(s, float4((uv) + (t) * float2( 1.0, -1.0), 0, 0)) \
    + tex2Dlod(s, float4((uv) + (t) * float2(-1.0,  1.0), 0, 0)) \
    + tex2Dlod(s, float4((uv) + (t) * float2( 1.0,  1.0), 0, 0))) * 0.125)

#define GM_UP_TENT(s, uv, t) ((tex2Dlod(s, float4((uv) + (t) * float2(-1.0, 0.0), 0, 0)) \
    + tex2Dlod(s, float4((uv) + (t) * float2( 1.0, 0.0), 0, 0)) \
    + tex2Dlod(s, float4((uv) + (t) * float2(0.0, -1.0), 0, 0)) \
    + tex2Dlod(s, float4((uv) + (t) * float2(0.0,  1.0), 0, 0)) \
    + (tex2Dlod(s, float4((uv) + (t) * float2(-0.5,  0.5), 0, 0)) \
     + tex2Dlod(s, float4((uv) + (t) * float2( 0.5,  0.5), 0, 0)) \
     + tex2Dlod(s, float4((uv) + (t) * float2( 0.5, -0.5), 0, 0)) \
     + tex2Dlod(s, float4((uv) + (t) * float2(-0.5, -0.5), 0, 0))) * 2.0) / 12.0)

#define GM_TEXEL(div) (1.0 / float2(BUFFER_WIDTH / (div), BUFFER_HEIGHT / (div)))

float4 PS_Down2(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target { return GM_DOWN_KAWASE(sGM_B1, uv, GM_TEXEL(4)); }
float4 PS_Down3(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target { return GM_DOWN_KAWASE(sGM_B2, uv, GM_TEXEL(8)); }
float4 PS_Down4(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target { return GM_DOWN_KAWASE(sGM_B3, uv, GM_TEXEL(16)); }
float4 PS_Down5(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target { return GM_DOWN_KAWASE(sGM_B4, uv, GM_TEXEL(32)); }
float4 PS_Down6(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target { return GM_DOWN_KAWASE(sGM_B5, uv, GM_TEXEL(64)); }

float4 Accumulate(float4 b, float4 up, float wb, float wup)
{
    return float4(b.rgb * wb + up.rgb * wup, lerp(b.a, up.a, 0.5));
}

float4 PS_Up5(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    return Accumulate(tex2Dlod(sGM_B5, float4(uv, 0, 0)), GM_UP_TENT(sGM_B6, uv, GM_TEXEL(128)), BloomW(5), BloomW(6));
}
float4 PS_Up4(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    return Accumulate(tex2Dlod(sGM_B4, float4(uv, 0, 0)), GM_UP_TENT(sGM_U5, uv, GM_TEXEL(64)), BloomW(4), 1.0);
}
float4 PS_Up3(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    return Accumulate(tex2Dlod(sGM_B3, float4(uv, 0, 0)), GM_UP_TENT(sGM_U4, uv, GM_TEXEL(32)), BloomW(3), 1.0);
}
float4 PS_Up2(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    return Accumulate(tex2Dlod(sGM_B2, float4(uv, 0, 0)), GM_UP_TENT(sGM_U3, uv, GM_TEXEL(16)), BloomW(2), 1.0);
}
float4 PS_Up1(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    return Accumulate(tex2Dlod(sGM_B1, float4(uv, 0, 0)), GM_UP_TENT(sGM_U2, uv, GM_TEXEL(8)), BloomW(1), 1.0);
}

/*=============================================================================
    Pass 21 - composite (full res)
=============================================================================*/

// joint-bilateral upsample of quarter-res (depth, guide luma, ao).
// Four bilinear taps at +-1 texel cover a 4x4 texel footprint: every phase of
// the 2x2 AO interleave is averaged and estimator speckle is filtered out,
// while the luma guide keeps the result from bleeding across object edges.
float3 UpsampleCompQ(float2 uv, float lumaFull)
{
    float3 acc = 0.0, fallback = 0.0;
    float wsum = 0.0;
    [unroll] for (int i = 0; i < 4; i++)
    {
        float2 o = float2((i & 1) ? 1.0 : -1.0, (i & 2) ? 1.0 : -1.0) * GM_QPX;
        float4 s = tex2Dlod(sGM_CompQLin, float4(uv + o, 0, 0));
        float dl = (s.y - lumaFull) * 12.0;
        float w = exp(-dl * dl) + 1e-4;
        acc += float3(s.x, s.z, s.y) * w;
        wsum += w;
    }
    return acc / wsum;
}

// joint-bilateral upsample of the half-res reflection buffer
float4 UpsampleSSR(float2 uv, float lumaFull)
{
    float2 pos = uv * float2(GM_HW, GM_HH) - 0.5;
    float2 base = floor(pos);
    float2 f = pos - base;
    float4 acc = 0.0;
    float wsum = 0.0;
    [unroll] for (int i = 0; i < 4; i++)
    {
        float2 o = float2(i & 1, i >> 1);
        float2 tuv = (base + o + 0.5) * GM_HPX;
        float4 s = tex2Dlod(sGM_SSRRes, float4(tuv, 0, 0));
        float l = tex2Dlod(sGM_ColorH, float4(tuv, 0, 0)).a;
        float bw = (o.x > 0.5 ? f.x : 1.0 - f.x) * (o.y > 0.5 ? f.y : 1.0 - f.y);
        float dl = (l - lumaFull) * 10.0;
        float w = bw * exp(-dl * dl) + 1e-4 * bw;
        acc += s * w;
        wsum += w;
    }
    return acc / max(wsum, 1e-6);
}

float SCurve(float x, float c)
{
    const float p = 0.46;   // perceptual mid grey
    float lo = p * pow(saturate(x / p), 1.0 + c);
    float hi = 1.0 - (1.0 - p) * pow(saturate((1.0 - x) / (1.0 - p)), 1.0 + c);
    return x < p ? lo : hi;
}

float3 WBGains()
{
    float t = GM_Temperature * 0.12, ti = GM_Tint * 0.08;
    float3 g = float3(1.0 + t, 1.0 - ti, 1.0 - t);
    return g / dot(g, GM::LUMA_W);
}

float4 PS_Composite(float4 vpos : SV_Position, float2 uv : TEXCOORD) : SV_Target
{
    float2 px = GM_PX;
    float3 c0  = tex2Dlod(ReShade::BackBuffer, float4(uv, 0, 0)).rgb;
    float3 cN  = tex2Dlod(ReShade::BackBuffer, float4(uv + float2(0.0, -px.y), 0, 0)).rgb;
    float3 cS  = tex2Dlod(ReShade::BackBuffer, float4(uv + float2(0.0,  px.y), 0, 0)).rgb;
    float3 cW  = tex2Dlod(ReShade::BackBuffer, float4(uv + float2(-px.x, 0.0), 0, 0)).rgb;
    float3 cE  = tex2Dlod(ReShade::BackBuffer, float4(uv + float2( px.x, 0.0), 0, 0)).rgb;
    float3 cNW = tex2Dlod(ReShade::BackBuffer, float4(uv + float2(-px.x, -px.y), 0, 0)).rgb;
    float3 cNE = tex2Dlod(ReShade::BackBuffer, float4(uv + float2( px.x, -px.y), 0, 0)).rgb;
    float3 cSW = tex2Dlod(ReShade::BackBuffer, float4(uv + float2(-px.x,  px.y), 0, 0)).rgb;
    float3 cSE = tex2Dlod(ReShade::BackBuffer, float4(uv + float2( px.x,  px.y), 0, 0)).rgb;

    float lC = GM::Luma(c0);
    float lN = GM::Luma(cN), lS = GM::Luma(cS), lW = GM::Luma(cW), lE = GM::Luma(cE);
    float lNW = GM::Luma(cNW), lNE = GM::Luma(cNE), lSW = GM::Luma(cSW), lSE = GM::Luma(cSE);
    float mn = min(lC, min(min(min(lN, lS), min(lW, lE)), min(min(lNW, lNE), min(lSW, lSE))));
    float mx = max(lC, max(max(max(lN, lS), max(lW, lE)), max(max(lNW, lNE), max(lSW, lSE))));
    float range = mx - mn;

    // ---- UI protection mask
    float band = TopBand(uv);
    // ---- depth / AO (edge-aware upsample)
    float3 cq = UpsampleCompQ(uv, lC);       // x = depth, y = ao, z = guide luma
    float depth = cq.x;
    float dist = DistT(depth, Stats(4).x);
    float sky = SStep(GM_SkyDepth - 0.02, GM_SkyDepth, depth);

    // flat, near-white, achromatic areas are typical Roblox UI panels (3D-lit
    // surfaces almost always carry some shading gradient); text = bright strokes
    float textLike = GM_UI_TextDetect ? UILikeness(c0, mn, mx, sky) : 0.0;
    if (GM_UI_TextDetect)   // dilate with the half-res mask so bold glyph interiors are covered
    {
        float d0 = tex2Dlod(sGM_UIH, float4(uv + GM_PX * float2(-1.5, -1.5), 0, 0)).x;
        float d1 = tex2Dlod(sGM_UIH, float4(uv + GM_PX * float2( 1.5, -1.5), 0, 0)).x;
        float d2 = tex2Dlod(sGM_UIH, float4(uv + GM_PX * float2(-1.5,  1.5), 0, 0)).x;
        float d3 = tex2Dlod(sGM_UIH, float4(uv + GM_PX * float2( 1.5,  1.5), 0, 0)).x;
        textLike = max(textLike, max(max(d0, d1), max(d2, d3)) * (1.0 - sky));
    }
    float ui = saturate(max(textLike, band)) * GM_UI_Protect;
    float local = 1.0 - ui;
    float k = ExpK();

    // ---- deband (before any sharpening)
    float3 base = c0;
    if (GM_Detail_Enable && GM_DebandStrength > 0.0 && range < 3.0 / 255.0)
    {
        float3 smoothC = GM::LinearToSRGB(GM::Compress(tex2Dlod(sGM_ColorH, float4(uv, 0, 2)).rgb, k));
        float3 dlt = smoothC - c0;
        float flatness = 1.0 - SStep(1.5 / 255.0, 3.0 / 255.0, range);
        float close = 1.0 - SStep(1.5 / 255.0, 3.0 / 255.0, GM::Max3(abs(dlt)));
        base = c0 + dlt * (flatness * close * GM_DebandStrength * local);
    }

    // ---- multi-scale detail (luma only, computed on the source neighbourhood)
    float detailDelta = 0.0;
    if (GM_Detail_Enable && local > 0.001)
    {
        float blur3 = lC * 0.25 + (lN + lS + lW + lE) * 0.125 + (lNW + lNE + lSW + lSE) * 0.0625;
        float lMid = tex2Dlod(sGM_ColorH, float4(uv, 0, 1)).a;
        float lCoarse = GM_LocalContrast > 0.0 ? tex2Dlod(sGM_U2, float4(uv, 0, 0)).a : lMid;
        float noiseGate = SStep(1.0 / 255.0, 4.0 / 255.0, range);
        float lim = GM_DetailLimit;
        float dFine = SoftLimit((lC - blur3) * GM_Sharpen * 2.0 * noiseGate, lim);
        float dMid = SoftLimit((blur3 - lMid) * GM_MicroContrast * 1.5, lim);
        float cb = lMid - lCoarse;
        float dCoarse = cb * GM_LocalContrast * exp(-cb * cb * 40.0);
        float distFade = (1.0 - GM_DetailDistanceFade * SStep(0.5, 1.0, dist)) * (1.0 - sky);
        float target = clamp(lC + (dFine + dMid) * distFade, mn - GM_Overshoot, mx + GM_Overshoot);
        detailDelta = ((target - lC) + dCoarse * distFade) * local;
    }

    // ---- linear HDR
    float3 baseLin = GM::SRGBToLinear(base);
    float3 hdr = GM::Expand(baseLin, k);
    float3 hdrIn = hdr;

    // reflections
    float4 refl = 0.0;
    if (GM_SSR_Enable && local > 0.001 && sky < 0.999)
    {
        float4 quick = tex2Dlod(sGM_SSRResLin, float4(uv, 0, 0));
        if (quick.a > 0.002)
        {
            refl = UpsampleSSR(uv, lC);
            hdr = lerp(hdr, refl.rgb, saturate(refl.a) * local * (1.0 - sky));
        }
    }

    // ambient occlusion with multi-bounce colour preservation
    if (GM_AO_Enable && sky < 0.999 && cq.y < 0.999)
    {
        float ao = lerp(1.0, cq.y, GM_AO_Strength * local * (1.0 - sky));
        float3 alb = saturate(baseLin);
        float3 ka = 2.0404 * alb - 0.3324, kb = -4.7951 * alb + 0.6417, kc = 2.7552 * alb + 0.6903;
        float3 aoMB = max(ao, ((ao * ka + kb) * ao + kc) * ao);
        hdr *= lerp(ao.xxx, aoMB, GM_AO_Bounce);
    }

    // detail, applied as a luma ratio so hue is preserved
    if (detailDelta != 0.0)
    {
        float ratio = pow((max(lC + detailDelta, 0.0) + 0.055) / (lC + 0.055), 2.4);
        hdr *= clamp(ratio, 0.5, 2.0);
    }

    // atmospheric depth haze towards the measured sky colour
    if (GM_Haze_Enable)
    {
        float fog = GM_Haze_Strength * SStep(GM_Haze_Start, 1.0, dist) * (1.0 - sky) * local;
        float3 hazeC = lerp(Stats(3).rgb, Stats(1).rgb, 0.75);
        hdr = lerp(hdr, hazeC, fog);
    }

    // bloom: energy-conserving, adaptation-limited, never onto UI
    float3 bloom = 0.0;
    if (GM_Bloom_Enable)
    {
        bloom = tex2Dlod(sGM_U1, float4(uv, 0, 0)).rgb / BloomWSum();   // U1 is already tent-filtered
        float3 self = tex2Dlod(sGM_B1, float4(uv, 0, 0)).rgb;
        float adapt = lerp(1.0, clamp(0.35 / (Stats(0).w + 0.05), 0.5, 1.4), GM_Bloom_Adapt);
        float3 add = (bloom - self * GM_Bloom_Conserve) * GM_Bloom_Strength * adapt;
        add *= 1.0 - max(textLike, band * 0.7) * GM_UI_Protect;
        hdr = max(hdr + add, 0.0);
    }

    // exposure / white balance, then back through the exact inverse curve
    float3 lin = hdr;
    if (GM_Tone_Enable) lin *= exp2(GM_Exposure) * WBGains();
    lin = GM::Compress(lin, k);

    if (GM_Tone_Enable)
    {
        // added light desaturates towards white
        float mIn = GM::Max3(hdrIn), mOut = GM::Max3(hdr);
        float added = saturate((mOut - mIn) / max(mOut, 1e-4)) * SStep(0.4, 1.0, GM::Max3(lin));
        lin = lerp(lin, GM::Luma(lin).xxx, added * GM_HighlightDesat);

        // vibrance: muted colours first, protect neutrals and skin
        float L = GM::Luma(lin);
        float s = GM::Sat(lin);
        float w = (1.0 - s) * (1.0 - s);
        w *= lerp(1.0, SStep(0.02, 0.12, s), GM_NeutralProtect);
        float dh = abs(frac(GM::Hue(lin) - 0.06 + 0.5) - 0.5);
        float skin = (1.0 - SStep(0.04, 0.08, dh)) * SStep(0.1, 0.25, s) * (1.0 - SStep(0.6, 0.8, s));
        w *= 1.0 - skin * GM_SkinProtect;
        lin = max(L + (lin - L) * (1.0 + GM_Vibrance * w) * GM_Saturation, 0.0);
    }

    float3 outC = GM::LinearToSRGB(lin);
    if (GM_Tone_Enable && GM_Contrast != 0.0)
    {
        float Y = GM::Luma(outC);
        outC = saturate(outC + (SCurve(Y, GM_Contrast) - Y));
    }

    // UI (top bar, text, flat panels): skip the global grade too, so it keeps its exact colours
    outC = lerp(outC, c0, saturate(max(band, textLike)) * GM_UI_GradeProtect * GM_UI_Protect);

    if (GM_Vignette > 0.0)
    {
        float2 v = (uv - 0.5) * float2(BUFFER_ASPECT_RATIO, 1.0);
        outC *= 1.0 - GM_Vignette * 0.35 * SStep(0.35, 1.1, length(v));
    }
    if (GM_Grain > 0.0)
    {
        float g = GM::Hash12(vpos.xy + float(GM_Frame % 1024) * 7.123) - 0.5;
        float Y = GM::Luma(outC);
        outC += g * GM_Grain * 0.06 * (1.0 - Y) * (1.0 - ui);
    }
    if (GM_Dither)
    {
        float2 fp = vpos.xy + float(GM_Frame % 64) * float2(1.618, 2.414);
        outC += (GM::Hash12(fp) + GM::Hash12(fp + 31.7) - 1.0) / 255.0;
    }

    // ---- debug views
    if (GM_Debug != 0)
    {
        if (GM_Debug == 1) outC = sky > 0.5 ? float3(0.6, 0.8, 1.0) : dist.xxx;
        else if (GM_Debug == 2) { float4 g = tex2Dlod(sGM_GeoQ, float4(uv, 0, 0)); outC = GM::DecodeNormal(g.xy) * float3(0.5, 0.5, -0.5) + 0.5; }
        else if (GM_Debug == 3) outC = tex2Dlod(sGM_GeoQ, float4(uv, 0, 0)).z * float3(0.3, 0.8, 1.0);
        else if (GM_Debug == 4) outC = GM::LinearToSRGB(GM::Compress(UpsampleSSR(uv, lC).rgb, k)) * UpsampleSSR(uv, lC).a;
        else if (GM_Debug == 5) outC = cq.y;
        else if (GM_Debug == 6) outC = GM::LinearToSRGB(GM::Compress(bloom, k));
        else if (GM_Debug == 7) outC = float3(textLike, ui, band);
        else if (GM_Debug == 8) outC = 0.5 + detailDelta * 5.0;
        else if (GM_Debug == 9) outC = tex2Dlod(sGM_Geo2Q, float4(uv, 0, 0)).xyz;
    }

    return float4(saturate(outC), 1.0);
}

/*=============================================================================
    Technique
=============================================================================*/

technique GrandMaster <
    ui_label = "GrandMaster";
    ui_tooltip = "Reflections, AO, multi-scale detail, bloom, filmic tone and natural grade\n"
                 "for Unishade + Roblox (estimated depth aware).\n"
                 "Start with the Depth debug view to confirm near = dark, far = bright.";
>
{
    pass Prep       { VertexShader = PostProcessVS; PixelShader = PS_Prep;       RenderTarget0 = GM_ColorHTex; RenderTarget1 = GM_UIHTex; }
    pass Stats      { VertexShader = PostProcessVS; PixelShader = PS_Stats;      RenderTarget = GM_StatsTex; }
    pass StatsCopy  { VertexShader = PostProcessVS; PixelShader = PS_StatsCopy;  RenderTarget = GM_StatsHistTex; }
    pass SmallCopy  { VertexShader = PostProcessVS; PixelShader = PS_SmallCopy;  RenderTarget = GM_PrevSmallTex; }
    pass DepthQ     { VertexShader = PostProcessVS; PixelShader = PS_DepthQ;     RenderTarget0 = GM_DepthQTex; RenderTarget1 = GM_B1Tex; }
    pass DepthQCopy { VertexShader = PostProcessVS; PixelShader = PS_DepthQCopy; RenderTarget = GM_DepthQHistTex; }
    pass DepthSnap  { VertexShader = PostProcessVS; PixelShader = PS_DepthFilter; RenderTarget = GM_DepthSTex; }
    pass Geometry   { VertexShader = PostProcessVS; PixelShader = PS_Geometry;   RenderTarget0 = GM_GeoQTex; RenderTarget1 = GM_Geo2QTex; RenderTarget2 = GM_CompQTex; }
    pass SSR        { VertexShader = PostProcessVS; PixelShader = PS_SSR;        RenderTarget = GM_SSRTex; }
    pass SSRResolve { VertexShader = PostProcessVS; PixelShader = PS_SSRResolve; RenderTarget = GM_SSRResTex; }
    pass SSRCopy    { VertexShader = PostProcessVS; PixelShader = PS_SSRCopy;    RenderTarget = GM_SSRHistTex; }
    pass Down2      { VertexShader = PostProcessVS; PixelShader = PS_Down2;      RenderTarget = GM_B2Tex; }
    pass Down3      { VertexShader = PostProcessVS; PixelShader = PS_Down3;      RenderTarget = GM_B3Tex; }
    pass Down4      { VertexShader = PostProcessVS; PixelShader = PS_Down4;      RenderTarget = GM_B4Tex; }
    pass Down5      { VertexShader = PostProcessVS; PixelShader = PS_Down5;      RenderTarget = GM_B5Tex; }
    pass Down6      { VertexShader = PostProcessVS; PixelShader = PS_Down6;      RenderTarget = GM_B6Tex; }
    pass Up5        { VertexShader = PostProcessVS; PixelShader = PS_Up5;        RenderTarget = GM_U5Tex; }
    pass Up4        { VertexShader = PostProcessVS; PixelShader = PS_Up4;        RenderTarget = GM_U4Tex; }
    pass Up3        { VertexShader = PostProcessVS; PixelShader = PS_Up3;        RenderTarget = GM_U3Tex; }
    pass Up2        { VertexShader = PostProcessVS; PixelShader = PS_Up2;        RenderTarget = GM_U2Tex; }
    pass Up1        { VertexShader = PostProcessVS; PixelShader = PS_Up1;        RenderTarget = GM_U1Tex; }
    pass Composite  { VertexShader = PostProcessVS; PixelShader = PS_Composite; }
}

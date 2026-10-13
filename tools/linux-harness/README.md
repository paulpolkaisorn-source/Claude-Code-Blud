# Linux validation harness (how GrandMaster was tested without Windows)

* `fxdump.cpp`: links ReShade's real FX front-end (crosire/reshade `source/effect_*.cpp`) and
  dumps the module reflection (textures, samplers, uniforms, passes) as JSON plus per-entry-point
  GLSL (or HLSL with `FXDUMP_HLSL=1`).
* `validate.sh`: parses GrandMaster.fx, then compiles every entry point with glslang (GLSL)
  and DXC (HLSL). Fails on any error.
* `fxrun.py`: executes the technique pass by pass on a headless OpenGL 4.5 context (Mesa
  llvmpipe via moderngl). It emulates ReShade's render targets, mip generation, sampler states,
  uniform sources (framecount, frametime) and back-buffer copies. It has optional per-pass timing.
* `scenes.py` / `mkscenes.py`: numpy ray-cast Roblox-like scenes, plus simulated Unishade
  depth (266×154, blurred, relative noise, gamma distortion) in linear / disparity / inverted
  encodings.
* `runtest.py`, `runpresets.py`, `robust.py`, `debugviews.py`, `probe.py`, `dumpssr.py`,
  `bloomsweep.py`: metrics (mean RGB, edge energy, halo overshoot, temporal flicker,
  non-finite check), presets, encodings, debug buffers.

Build outline: clone `crosire/reshade` (+ `deps/spirv` submodule), compile the effect_*.cpp
files plus `fxdump.cpp` with g++ -std=c++17 (stub `create_codegen_dxbc`), then
`pip install moderngl` and Mesa EGL. The paths inside the scripts point at the original
scratch directory; adjust `S=` / `HERE` as needed.

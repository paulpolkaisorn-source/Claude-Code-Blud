#!/bin/bash
# Build the GLSL test module; depth macros make GetLinearizedDepth return the fed value unchanged.
S=/tmp/claude-0/-home-user-Claude-Code-Blud/0179b52c-ae76-523d-89d2-22c0939a5857/scratchpad
FX=/home/user/Claude-Code-Blud/Unishade/reshade-shaders/Shaders/Custom/GrandMaster.fx
rm -rf $S/out/gm; mkdir -p $S/out/gm
$S/build/fxdump $FX $S/out/gm 1280 768 -I $S/ext/reshade-shaders/Shaders -D RESHADE_DEPTH_INPUT_IS_REVERSED=0 -D RESHADE_DEPTH_LINEARIZATION_FAR_PLANE=1

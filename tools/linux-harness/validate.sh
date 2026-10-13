#!/bin/bash
# Full validation: ReShade FX parse (GLSL+HLSL backends), glslang on all GLSL, DXC on all HLSL.
S=/tmp/claude-0/-home-user-Claude-Code-Blud/0179b52c-ae76-523d-89d2-22c0939a5857/scratchpad
FX=${1:-/home/user/Claude-Code-Blud/Unishade/reshade-shaders/Shaders/Custom/GrandMaster.fx}
W=${2:-1280}; H=${3:-768}
export LD_LIBRARY_PATH=$S/dxc/lib
rm -rf $S/out/gm $S/out/hlsl; mkdir -p $S/out/gm $S/out/hlsl
$S/build/fxdump $FX $S/out/gm $W $H -I $S/ext/reshade-shaders/Shaders 2> $S/out/gm/errors.txt || { echo "FX PARSE FAIL (GLSL)"; cat $S/out/gm/errors.txt; exit 1; }
[ -s $S/out/gm/errors.txt ] && { echo "FX diagnostics:"; cat $S/out/gm/errors.txt; grep -q "error" $S/out/gm/errors.txt && exit 1; }
FXDUMP_HLSL=1 $S/build/fxdump $FX $S/out/hlsl 3840 2304 -I $S/ext/reshade-shaders/Shaders 2> $S/out/hlsl/errors.txt || { echo "FX PARSE FAIL (HLSL)"; cat $S/out/hlsl/errors.txt; exit 1; }
fails=0; n=0
for f in $S/out/gm/E_*.glsl; do n=$((n+1)); ext=frag; [[ $f == *VS* ]] && ext=vert; cp $f /tmp/claude-0/t.$ext; glslangValidator /tmp/claude-0/t.$ext > /tmp/claude-0/gv.txt 2>&1 || { echo "GLSL FAIL $f"; head -5 /tmp/claude-0/gv.txt; fails=$((fails+1)); }; done
for f in $S/out/hlsl/*.hlsl; do n=$((n+1)); ep=$(basename $f .hlsl); prof=ps_6_0; [[ $ep == *VS* ]] && prof=vs_6_0; $S/dxc/bin/dxc -T $prof -E $ep -HV 2018 $f -Fo /tmp/claude-0/o.dxil > /tmp/claude-0/dx.txt 2>&1 || { echo "DXC FAIL $ep"; grep -m5 error /tmp/claude-0/dx.txt; fails=$((fails+1)); }; grep -q warning /tmp/claude-0/dx.txt && { echo "DXC warnings in $ep:"; grep -m3 warning /tmp/claude-0/dx.txt; }; done
echo "validated $n shader stages, failures: $fails"
[ $fails -eq 0 ]

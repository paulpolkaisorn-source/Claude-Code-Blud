# GrandMaster: post-process shader for Unishade + Roblox

A ReShade FX effect for Unishade: screen-space reflections on floors and water, contact AO,
multi-scale detail, natural bloom, a reversible filmic tone curve and a restrained colour
grade. It is designed around Unishade's **estimated** depth (depth-anything-v2-small), not a
real depth buffer.

| | |
|---|---|
| Effect | [`Unishade/reshade-shaders/Shaders/Custom/GrandMaster.fx`](Unishade/reshade-shaders/Shaders/Custom/GrandMaster.fx) (+ `GrandMaster/GM_Common.fxh`) |
| Shader docs (passes, every uniform, tuning) | [`Unishade/reshade-shaders/Shaders/Custom/README.md`](Unishade/reshade-shaders/Shaders/Custom/README.md) |
| Presets | [`Unishade/presets/`](Unishade/presets) Balanced / Ultra / Reality |
| Install / restore / on-machine test | [`tools/`](tools) (PowerShell) |
| Final report (results, limits, perf, restore) | [`docs/REPORT.md`](docs/REPORT.md) |
| Design doc | [`docs/DESIGN.md`](docs/DESIGN.md) |
| Evidence (before/after, debug buffers, metrics) | [`docs/evidence/`](docs/evidence) |

## Install (Windows, from the repo folder)

```
powershell -ExecutionPolicy Bypass -File .\tools\Install-GrandMaster.ps1                 # Ultra
powershell -ExecutionPolicy Bypass -File .\tools\Install-GrandMaster.ps1 -Preset GrandMaster_Reality.ini
```

This copies the files and backs up `RobloxShadeHost.ini` → `RobloxShadeHost.ini.bak_claude`.
It changes **only** `[GamePresets] Roblox=` and prints the original value. It then restarts
Unishade and checks `ReShade.log` / `Unishade.log`.

## Measure on your machine

```
powershell -ExecutionPolicy Bypass -File .\tools\Test-GrandMaster.ps1 -Scene floor
```

Stand still in game. For each of Off / Balanced / Ultra / Reality the script restarts
Unishade, verifies the compile, averages `processing_ms` / `present_fps` / `capture_fps`
from the State lines, and takes a Ctrl+F9 shot. It then writes a report with image metrics
and ×4 diff maps. Repeat with `-Scene water | sky | ui | texture`.

## Restore

```
powershell -ExecutionPolicy Bypass -File .\tools\Restore-RobloxPreset.ps1        # put Roblox= back
powershell -ExecutionPolicy Bypass -File .\tools\Restore-RobloxPreset.ps1 -RemoveGrandMaster
```

> **Testing scope.** This was built and verified in a cloud container. It was checked with
> ReShade's own FX compiler, DXC and glslang, and the compiled effect was rendered headlessly
> on synthetic Roblox-like scenes. It has **not yet** run on the target PC. See
> `docs/REPORT.md` §0.

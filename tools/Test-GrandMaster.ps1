<#
.SYNOPSIS
    On-machine test loop for GrandMaster: per preset, restart Unishade, verify the compile,
    measure processing_ms / present_fps / capture_fps from Unishade.log State lines,
    take a Ctrl+F9 screenshot of the same frame, then compare every preset against "Off".

.DESCRIPTION
    Stand still in-game (do not touch mouse/keyboard while it runs). Run once per test
    scene, e.g. -Scene floor, then move the camera and run -Scene water, etc.

    "Off" uses a temporary preset (presets\GrandMaster_Off_tmp.ini, no techniques) that is
    deleted at the end. Your [GamePresets] Roblox= value is put back to what it was when
    the script started. Results go to -OutDir (default: tools\results\<scene>_<time>).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\tools\Test-GrandMaster.ps1 -Scene floor
    powershell -ExecutionPolicy Bypass -File .\tools\Test-GrandMaster.ps1 -Scene water -LaunchGame
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('floor', 'water', 'sky', 'ui', 'texture', 'other')][string]$Scene,
    [string]$UnishadeDir = '',
    [string]$ShotDir = '',
    [string[]]$Presets = @('Off', 'GrandMaster_Balanced.ini', 'GrandMaster_Ultra.ini', 'GrandMaster_Reality.ini'),
    [int]$SettleSec = 15,
    [int]$MeasureSec = 30,
    [string]$OutDir = '',
    [switch]$LaunchGame,
    [long]$PlaceId = 189707
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'GrandMaster.Common.psm1') -Force
if (-not $UnishadeDir) { $UnishadeDir = Get-DefaultUnishadeDir }
if (-not $ShotDir) { $ShotDir = Join-Parts $env:USERPROFILE 'Pictures' 'Unishade' }
if (-not $OutDir) { $OutDir = Join-Parts $PSScriptRoot 'results' ("{0}_{1}" -f $Scene, (Get-Date -Format 'yyyyMMdd_HHmmss')) }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$hostIni = Join-Path $UnishadeDir 'RobloxShadeHost.ini'
$unishadeLog = Join-Path $UnishadeDir 'Unishade.log'
$presetDir = Join-Path $UnishadeDir 'presets'
$offPreset = Join-Path $presetDir 'GrandMaster_Off_tmp.ini'
if (-not (Test-Path -LiteralPath (Join-Path $presetDir 'GrandMaster_Ultra.ini'))) { throw "GrandMaster presets not installed - run Install-GrandMaster.ps1 first." }

$startValue = Get-IniValue -Text (Read-TextPreserving -Path $hostIni).Text -Section 'GamePresets' -Key 'Roblox'
if (-not (Test-Path -LiteralPath "$hostIni.bak_claude")) { Copy-Item -LiteralPath $hostIni -Destination "$hostIni.bak_claude" }
Write-Host "Roblox preset at start: $startValue (restored at the end)"

if ($LaunchGame -or -not (Get-Process -Name 'RobloxPlayerBeta' -ErrorAction SilentlyContinue)) {
    Write-Host "Launching Natural Disaster Survival ..."
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'start', '""', ("roblox://experiences/start?placeId={0}" -f $PlaceId) -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds(120)
    while (-not (Get-Process -Name 'RobloxPlayerBeta' -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 2 }
    Write-Host "Waiting 45 s for the place to load - position the camera for '$Scene' and stand still."
    Start-Sleep -Seconds 45
}

$results = @()
try {
    [System.IO.File]::WriteAllText($offPreset, "Techniques=`r`nTechniqueSorting=`r`n")
    foreach ($p in $Presets) {
        $file = $p
        if ($p -eq 'Off') { $file = 'GrandMaster_Off_tmp.ini' }
        Write-Host ""
        Write-Host "=== $p ==="
        [void](Set-IniValueInFile -Path $hostIni -Section 'GamePresets' -Key 'Roblox' -Value $file)
        $v = Restart-UnishadeAndVerify -UnishadeDir $UnishadeDir -ExpectGrandMaster:($p -ne 'Off')
        Write-Host ("compiled={0}  presetSelected={1}" -f $v.Compiled, $v.PresetSelected)
        if ($v.CompileLine) { Write-Host "  $($v.CompileLine)" }
        if ($v.PresetLine) { Write-Host "  $($v.PresetLine)" }
        foreach ($e in $v.ErrorLines) { Write-Warning $e }

        [void](Set-RobloxForeground)
        Start-Sleep -Seconds $SettleSec
        $len0 = Get-LogLength -Path $unishadeLog
        $t0 = Get-Date
        Start-Sleep -Seconds $MeasureSec
        $stats = Get-StateStats -LogText (Read-NewLogText -Path $unishadeLog -OldLength $len0 -Since $t0)

        # screenshot of the same (static) frame
        [void](Set-RobloxForeground)
        $shotT = Get-Date
        Send-KeyChord -Chord 'CTRL+F9'
        $shot = $null
        $deadline = (Get-Date).AddSeconds(15)
        while (-not $shot -and (Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 500
            if (Test-Path -LiteralPath $ShotDir) {
                $shot = Get-ChildItem -LiteralPath $ShotDir -File | Where-Object { $_.LastWriteTime -ge $shotT.AddSeconds(-1) -and $_.Extension -match '^\.(png|jpg|jpeg|bmp)$' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            }
        }
        $shotCopy = ''
        if ($shot) {
            Start-Sleep -Milliseconds 500
            $shotCopy = Join-Path $OutDir ("{0}_{1}{2}" -f $Scene, ($p -replace '\.ini$', ''), $shot.Extension)
            Copy-Item -LiteralPath $shot.FullName -Destination $shotCopy   # read-only use of your screenshot folder
            Write-Host "  screenshot: $shotCopy"
        } else { Write-Warning "No new screenshot appeared in $ShotDir (Ctrl+F9 may not have reached Unishade)." }

        $results += [pscustomobject]@{
            preset = $p; compiled = $v.Compiled; preset_selected = $v.PresetSelected; samples = $stats.Samples
            processing_ms_mean = $stats.processing_ms.mean; processing_ms_p95 = $stats.processing_ms.p95
            present_fps_mean = $stats.present_fps.mean; capture_fps_mean = $stats.capture_fps.mean
            screenshot = $shotCopy
        }
        Write-Host ("  State samples={0} processing_ms mean={1} p95={2} present_fps={3} capture_fps={4}" -f $stats.Samples, $stats.processing_ms.mean, $stats.processing_ms.p95, $stats.present_fps.mean, $stats.capture_fps.mean)
    }
} finally {
    [void](Set-IniValueInFile -Path $hostIni -Section 'GamePresets' -Key 'Roblox' -Value $startValue)
    if (Test-Path -LiteralPath $offPreset) { Remove-Item -LiteralPath $offPreset -Force }
    Write-Host ""
    Write-Host "Restored [GamePresets] Roblox=$startValue; restarting Unishade."
    [void](Restart-UnishadeAndVerify -UnishadeDir $UnishadeDir -TimeoutSec 30)
}

# ---- image comparisons against Off
$off = $results | Where-Object { $_.preset -eq 'Off' -and $_.screenshot } | Select-Object -First 1
$cmp = @()
if ($off) {
    $before = Read-ImageBgra -Path $off.screenshot
    foreach ($r in ($results | Where-Object { $_.preset -ne 'Off' -and $_.screenshot })) {
        $after = Read-ImageBgra -Path $r.screenshot
        if ($after.Width -ne $before.Width -or $after.Height -ne $before.Height) { Write-Warning "Size mismatch for $($r.preset)"; continue }
        $diffPath = Join-Path $OutDir ("{0}_{1}_diff_x4.png" -f $Scene, ($r.preset -replace '\.ini$', ''))
        $m = Compare-Bgra -Width $before.Width -Height $before.Height -Before $before.Bgra -After $after.Bgra -DiffPath $diffPath
        $m | Add-Member -NotePropertyName preset -NotePropertyValue $r.preset
        $cmp += $m
    }
}

# ---- report
$base = $results | Where-Object { $_.preset -eq 'Off' } | Select-Object -First 1
$md = @("# GrandMaster test - scene '$Scene' - $(Get-Date -Format s)", '', '| preset | compiled | processing_ms mean | p95 | present_fps | capture_fps | fps vs Off |', '|---|---|---|---|---|---|---|')
foreach ($r in $results) {
    $rel = ''
    if ($base -and $base.present_fps_mean -gt 0 -and $r.present_fps_mean -gt 0) { $rel = '{0:+0.0;-0.0}%' -f (100.0 * ($r.present_fps_mean / $base.present_fps_mean - 1.0)) }
    $md += ('| {0} | {1} | {2} | {3} | {4} | {5} | {6} |' -f $r.preset, $r.compiled, $r.processing_ms_mean, $r.processing_ms_p95, $r.present_fps_mean, $r.capture_fps_mean, $rel)
}
if ($cmp.Count -gt 0) {
    $md += ''; $md += '| preset | mean RGB off | mean RGB on | edge energy off -> on | mean abs diff | halo mean / p99.9 |'; $md += '|---|---|---|---|---|---|'
    foreach ($c in $cmp) {
        $md += ('| {0} | {1} | {2} | {3} -> {4} | {5} | {6} / {7} |' -f $c.preset, ($c.mean_rgb_before -join ', '), ($c.mean_rgb_after -join ', '), $c.edge_energy_before, $c.edge_energy_after, $c.mean_abs_diff, $c.halo_mean, $c.halo_p999)
    }
}
$md -join "`r`n" | Set-Content -LiteralPath (Join-Path $OutDir 'report.md') -Encoding ASCII
@{ perf = $results; images = $cmp } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutDir 'results.json') -Encoding ASCII
Write-Host ""
$md | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "Saved to $OutDir"

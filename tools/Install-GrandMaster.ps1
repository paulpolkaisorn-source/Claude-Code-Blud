<#
.SYNOPSIS
    Installs GrandMaster into Unishade and makes it the active Roblox preset.

.DESCRIPTION
    - Copies Custom\GrandMaster.fx and Custom\GrandMaster\*.fxh into reshade-shaders\Shaders.
    - Copies GrandMaster_Balanced.ini / _Ultra.ini / _Reality.ini into presets\.
    - Backs up RobloxShadeHost.ini to RobloxShadeHost.ini.bak_claude (only if no backup exists yet).
    - Changes ONLY the value of "Roblox=" under [GamePresets]. Nothing else is modified.
    - If your current Roblox preset defines global PreprocessorDefinitions (e.g. depth
      settings Unishade relies on), the same line is copied into the GrandMaster presets.
    - Restarts Unishade and checks ReShade.log / Unishade.log for a successful compile.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\tools\Install-GrandMaster.ps1
    powershell -ExecutionPolicy Bypass -File .\tools\Install-GrandMaster.ps1 -Preset GrandMaster_Reality.ini
#>
[CmdletBinding()]
param(
    [string]$UnishadeDir = '',
    [ValidateSet('GrandMaster_Ultra.ini', 'GrandMaster_Balanced.ini', 'GrandMaster_Reality.ini')]
    [string]$Preset = 'GrandMaster_Ultra.ini',
    [string]$RepoDir = '',
    [switch]$NoRestart,
    [switch]$WhatIfOnly
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'GrandMaster.Common.psm1') -Force

if (-not $UnishadeDir) { $UnishadeDir = Get-DefaultUnishadeDir }
if (-not $RepoDir) { $RepoDir = Split-Path -Parent $PSScriptRoot }

$srcShaders = Join-Parts $RepoDir 'Unishade' 'reshade-shaders' 'Shaders' 'Custom'
$srcPresets = Join-Parts $RepoDir 'Unishade' 'presets'
$dstShaders = Join-Parts $UnishadeDir 'reshade-shaders' 'Shaders' 'Custom'
$dstPresets = Join-Path $UnishadeDir 'presets'
$hostIni    = Join-Path $UnishadeDir 'RobloxShadeHost.ini'
$backup     = "$hostIni.bak_claude"

foreach ($p in @($UnishadeDir, (Join-Parts $UnishadeDir 'reshade-shaders' 'Shaders'), $dstPresets, $hostIni, (Join-Path $srcShaders 'GrandMaster.fx'))) {
    if (-not (Test-Path -LiteralPath $p)) { throw "Required path not found: $p" }
}

# ---- read the current Roblox preset before touching anything
$hostDoc = Read-TextPreserving -Path $hostIni
$original = Get-IniValue -Text $hostDoc.Text -Section 'GamePresets' -Key 'Roblox'
if ($null -eq $original) { throw "No 'Roblox=' entry under [GamePresets] in $hostIni - nothing changed." }
Write-Host "Current [GamePresets] Roblox=$original"

# the backup is made once and never overwritten, so it always holds your original file
if (Test-Path -LiteralPath $backup) {
    $bakDoc = Read-TextPreserving -Path $backup
    $bakVal = Get-IniValue -Text $bakDoc.Text -Section 'GamePresets' -Key 'Roblox'
    Write-Host "Backup already exists ($backup), original value there: Roblox=$bakVal"
} elseif (-not $WhatIfOnly) {
    Copy-Item -LiteralPath $hostIni -Destination $backup
    Write-Host "Backed up RobloxShadeHost.ini -> $backup"
}

# ---- copy shader files (new files; only GrandMaster files are ever written)
$files = @(
    @{ From = (Join-Path $srcShaders 'GrandMaster.fx'); To = (Join-Path $dstShaders 'GrandMaster.fx') }
)
Get-ChildItem -LiteralPath (Join-Path $srcShaders 'GrandMaster') -Filter '*.fxh' | ForEach-Object {
    $files += @{ From = $_.FullName; To = (Join-Path (Join-Path $dstShaders 'GrandMaster') $_.Name) }
}
Get-ChildItem -LiteralPath $srcPresets -Filter 'GrandMaster_*.ini' | ForEach-Object {
    $files += @{ From = $_.FullName; To = (Join-Path $dstPresets $_.Name) }
}
foreach ($f in $files) {
    Write-Host ("copy  {0}" -f $f.To)
    if (-not $WhatIfOnly) {
        $dir = Split-Path -Parent $f.To
        if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
        Copy-Item -LiteralPath $f.From -Destination $f.To -Force
    }
}

# ---- carry over global preprocessor definitions from the user's current preset
$origPresetPath = Join-Path $dstPresets $original
if (-not (Test-Path -LiteralPath $origPresetPath)) { $origPresetPath = Join-Path $UnishadeDir $original }
$ppd = Get-PresetGlobalValue -Path $origPresetPath -Key 'PreprocessorDefinitions'
if ($ppd) {
    Write-Host "Your current preset defines PreprocessorDefinitions=$ppd"
    Write-Host "Copying that line into the GrandMaster presets so depth is read the same way."
    if (-not $WhatIfOnly) {
        Get-ChildItem -LiteralPath $dstPresets -Filter 'GrandMaster_*.ini' | ForEach-Object {
            $doc = Read-TextPreserving -Path $_.FullName
            $t = [regex]::Replace($doc.Text, '(?im)^[ \t]*PreprocessorDefinitions[ \t]*=[^\r\n]*\r?\n', '')
            $t = "PreprocessorDefinitions=$ppd`r`n" + $t
            Write-TextPreserving -Path $_.FullName -Doc $doc -Text $t
        }
    }
}

# ---- switch the one line
if ($WhatIfOnly) {
    Write-Host "WhatIf: would set [GamePresets] Roblox=$Preset (was $original)"
    return
}
$old = Set-IniValueInFile -Path $hostIni -Section 'GamePresets' -Key 'Roblox' -Value $Preset
Write-Host "Set [GamePresets] Roblox=$Preset   (previous value: $old)"
Write-Host ""
Write-Host "To restore later:  powershell -ExecutionPolicy Bypass -File .\tools\Restore-RobloxPreset.ps1"
Write-Host "Original value (also kept in $backup):  Roblox=$original"

if ($NoRestart) { return }
Write-Host ""
Write-Host "Restarting Unishade so the effect compiles ..."
$r = Restart-UnishadeAndVerify -UnishadeDir $UnishadeDir -ExpectGrandMaster
if ($r.Compiled) { Write-Host "OK  ReShade.log : $($r.CompileLine)" } else { Write-Warning "ReShade.log does not show 'Successfully compiled ... GrandMaster.fx' yet." }
if ($r.PresetSelected) { Write-Host "OK  Unishade.log: $($r.PresetLine)" } else { Write-Warning "Unishade.log does not show 'ReShade preset selected' yet." }
foreach ($e in $r.ErrorLines) { Write-Warning "ReShade.log: $e" }

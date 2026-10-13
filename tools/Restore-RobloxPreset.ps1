<#
.SYNOPSIS
    Restores your original Unishade Roblox preset (the value of "Roblox=" under [GamePresets]).

.DESCRIPTION
    Reads the original value from RobloxShadeHost.ini.bak_claude (written by Install-GrandMaster.ps1)
    and puts ONLY that value back into RobloxShadeHost.ini. Optionally removes the GrandMaster files.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\tools\Restore-RobloxPreset.ps1
    powershell -ExecutionPolicy Bypass -File .\tools\Restore-RobloxPreset.ps1 -RemoveGrandMaster
#>
[CmdletBinding()]
param(
    [string]$UnishadeDir = '',
    [string]$Value = '',          # restore to this value instead of the one in the backup
    [switch]$RemoveGrandMaster,
    [switch]$NoRestart
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'GrandMaster.Common.psm1') -Force
if (-not $UnishadeDir) { $UnishadeDir = Get-DefaultUnishadeDir }
$hostIni = Join-Path $UnishadeDir 'RobloxShadeHost.ini'
$backup = "$hostIni.bak_claude"

if (-not $Value) {
    if (-not (Test-Path -LiteralPath $backup)) { throw "No backup found at $backup. Pass -Value <preset.ini> to restore manually." }
    $bak = Read-TextPreserving -Path $backup
    $Value = Get-IniValue -Text $bak.Text -Section 'GamePresets' -Key 'Roblox'
    if ($null -eq $Value) { throw "Backup has no [GamePresets] Roblox= entry." }
}
$old = Set-IniValueInFile -Path $hostIni -Section 'GamePresets' -Key 'Roblox' -Value $Value
Write-Host "Restored [GamePresets] Roblox=$Value   (was: $old)"

if ($RemoveGrandMaster) {
    $targets = @(
        (Join-Parts $UnishadeDir 'reshade-shaders' 'Shaders' 'Custom' 'GrandMaster.fx'),
        (Join-Parts $UnishadeDir 'reshade-shaders' 'Shaders' 'Custom' 'GrandMaster')
    ) + @(Get-ChildItem -LiteralPath (Join-Path $UnishadeDir 'presets') -Filter 'GrandMaster_*.ini' | ForEach-Object { $_.FullName })
    foreach ($t in $targets) {
        if (Test-Path -LiteralPath $t) { Remove-Item -LiteralPath $t -Recurse -Force; Write-Host "removed $t" }
    }
}

if (-not $NoRestart) {
    $r = Restart-UnishadeAndVerify -UnishadeDir $UnishadeDir
    if ($r.PresetSelected) { Write-Host "OK  Unishade.log: $($r.PresetLine)" } else { Write-Warning "Unishade.log does not show 'ReShade preset selected' yet." }
}

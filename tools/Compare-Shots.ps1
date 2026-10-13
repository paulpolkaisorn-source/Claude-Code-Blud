<#
.SYNOPSIS
    Compares two screenshots of the same frame (shader off vs on): mean RGB, luma edge
    energy, mean abs difference, halo/ringing overshoot at strong edges, x4 diff map.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\tools\Compare-Shots.ps1 -Before off.png -After ultra.png
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Before,
    [Parameter(Mandatory)][string]$After,
    [string]$DiffOut = ''
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'GrandMaster.Common.psm1') -Force
$b = Read-ImageBgra -Path $Before
$a = Read-ImageBgra -Path $After
if ($a.Width -ne $b.Width -or $a.Height -ne $b.Height) { throw "Images differ in size: $($b.Width)x$($b.Height) vs $($a.Width)x$($a.Height)" }
if (-not $DiffOut) { $DiffOut = [System.IO.Path]::ChangeExtension($After, $null).TrimEnd('.') + '_diff_x4.png' }
$m = Compare-Bgra -Width $b.Width -Height $b.Height -Before $b.Bgra -After $a.Bgra -DiffPath $DiffOut
$m | Format-List
Write-Host "diff map: $DiffOut"

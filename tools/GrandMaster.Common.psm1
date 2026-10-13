# GrandMaster.Common.psm1 - shared helpers for the GrandMaster install / test / restore scripts.
# Windows PowerShell 5.1 and PowerShell 7 compatible. ASCII only on purpose.

Set-StrictMode -Version 2.0

# Joins path segments with the platform separator (no embedded backslashes).
function Join-Parts {
    param([Parameter(ValueFromRemainingArguments)][string[]]$Parts)
    return [System.IO.Path]::Combine([string[]]$Parts)
}

function Get-DefaultUnishadeDir {
    return (Join-Parts $env:LOCALAPPDATA 'Programs' 'Unishade')
}

# ---------------------------------------------------------------- text files
# Reads a text file and remembers its encoding (BOM based) so it can be written
# back byte-compatible. Line endings are kept because we never split lines.
function Read-TextPreserving {
    param([Parameter(Mandatory)][string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $enc = $null; $skip = 0
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { $enc = New-Object System.Text.UTF8Encoding($true); $skip = 3 }
    elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { $enc = New-Object System.Text.UnicodeEncoding($false, $true); $skip = 2 }
    elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) { $enc = New-Object System.Text.UnicodeEncoding($true, $true); $skip = 2 }
    else { $enc = New-Object System.Text.UTF8Encoding($false) }
    $text = $enc.GetString($bytes, $skip, $bytes.Length - $skip)
    return [pscustomobject]@{ Text = $text; Encoding = $enc; HasBom = ($skip -gt 0) }
}

function Write-TextPreserving {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)]$Doc, [Parameter(Mandatory)][string]$Text)
    $body = $Doc.Encoding.GetBytes($Text)
    if ($Doc.HasBom) { $pre = $Doc.Encoding.GetPreamble(); $all = New-Object byte[] ($pre.Length + $body.Length); [Array]::Copy($pre, $all, $pre.Length); [Array]::Copy($body, 0, $all, $pre.Length, $body.Length); $body = $all }
    [System.IO.File]::WriteAllBytes($Path, $body)
}

# Finds "Key=value" inside "[Section]" (case-insensitive). Returns $null if absent.
function Get-IniValue {
    param([Parameter(Mandatory)][string]$Text, [Parameter(Mandatory)][string]$Section, [Parameter(Mandatory)][string]$Key)
    $m = Find-IniKey -Text $Text -Section $Section -Key $Key
    if ($null -eq $m) { return $null }
    return $m.Value
}

function Find-IniKey {
    param([string]$Text, [string]$Section, [string]$Key)
    $secRx = New-Object System.Text.RegularExpressions.Regex ('(?im)^[ \t]*\[' + [regex]::Escape($Section) + '\][ \t]*\r?$')
    $sm = $secRx.Match($Text)
    if (-not $sm.Success) { return $null }
    $start = $sm.Index + $sm.Length
    $nextRx = New-Object System.Text.RegularExpressions.Regex ('(?m)^[ \t]*\[')
    $nm = $nextRx.Match($Text, $start)
    $end = $Text.Length
    if ($nm.Success) { $end = $nm.Index }
    $body = $Text.Substring($start, $end - $start)
    $keyRx = New-Object System.Text.RegularExpressions.Regex ('(?im)^([ \t]*' + [regex]::Escape($Key) + '[ \t]*=[ \t]*)([^\r\n]*)')
    $km = $keyRx.Match($body)
    if (-not $km.Success) { return $null }
    return [pscustomobject]@{
        Value       = $km.Groups[2].Value.Trim()
        ValueIndex  = $start + $km.Groups[2].Index
        ValueLength = $km.Groups[2].Length
    }
}

# Replaces only the value of one existing key in one section; everything else stays byte-identical.
function Set-IniValueInFile {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Section, [Parameter(Mandatory)][string]$Key, [Parameter(Mandatory)][string]$Value)
    $doc = Read-TextPreserving -Path $Path
    $m = Find-IniKey -Text $doc.Text -Section $Section -Key $Key
    if ($null -eq $m) { throw "Key '$Key' not found in section [$Section] of $Path - refusing to add it." }
    $old = $m.Value
    $new = $doc.Text.Substring(0, $m.ValueIndex) + $Value + $doc.Text.Substring($m.ValueIndex + $m.ValueLength)
    Write-TextPreserving -Path $Path -Doc $doc -Text $new
    return $old
}

# Global (section-less) key of a ReShade preset, e.g. PreprocessorDefinitions.
function Get-PresetGlobalValue {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Key)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $doc = Read-TextPreserving -Path $Path
    $head = $doc.Text
    $first = [regex]::Match($head, '(?m)^[ \t]*\[')
    if ($first.Success) { $head = $head.Substring(0, $first.Index) }
    $m = [regex]::Match($head, '(?im)^[ \t]*' + [regex]::Escape($Key) + '[ \t]*=[ \t]*([^\r\n]*)')
    if (-not $m.Success) { return $null }
    return $m.Groups[1].Value.Trim()
}

# ---------------------------------------------------------------- Unishade process
function Stop-Unishade {
    $p = Get-Process -Name 'Unishade' -ErrorAction SilentlyContinue
    if ($p) {
        $p | Stop-Process -Force
        $deadline = (Get-Date).AddSeconds(20)
        while ((Get-Process -Name 'Unishade' -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
    }
}

function Start-Unishade {
    param([Parameter(Mandatory)][string]$UnishadeDir)
    $exe = Join-Path $UnishadeDir 'Unishade.exe'
    if (-not (Test-Path -LiteralPath $exe)) { throw "Unishade.exe not found at $exe" }
    Start-Process -FilePath $exe -WorkingDirectory $UnishadeDir | Out-Null
}

# Restarts Unishade and checks the logs written after the restart.
# Returns an object with Compiled / PresetSelected / ErrorLines.
function Restart-UnishadeAndVerify {
    param([Parameter(Mandatory)][string]$UnishadeDir, [int]$TimeoutSec = 90, [switch]$ExpectGrandMaster)
    $reshadeLog = Join-Path $UnishadeDir 'ReShade.log'
    $unishadeLog = Join-Path $UnishadeDir 'Unishade.log'
    $rsLen0 = 0; $usLen0 = 0
    Stop-Unishade
    if (Test-Path -LiteralPath $reshadeLog) { $rsLen0 = (Get-Item -LiteralPath $reshadeLog).Length }
    if (Test-Path -LiteralPath $unishadeLog) { $usLen0 = (Get-Item -LiteralPath $unishadeLog).Length }
    $t0 = Get-Date
    Start-Unishade -UnishadeDir $UnishadeDir
    $res = [pscustomobject]@{ Compiled = $false; PresetSelected = $false; CompileLine = ''; PresetLine = ''; ErrorLines = @() }
    $deadline = $t0.AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 1
        $rs = Read-NewLogText -Path $reshadeLog -OldLength $rsLen0 -Since $t0
        $us = Read-NewLogText -Path $unishadeLog -OldLength $usLen0 -Since $t0
        if ($rs) {
            $c = [regex]::Match($rs, '(?im)^.*Successfully compiled.*GrandMaster\.fx.*$')
            if ($c.Success) { $res.Compiled = $true; $res.CompileLine = $c.Value.Trim() }
            $errs = [regex]::Matches($rs, '(?im)^.*(GrandMaster\.fx.*(error|failed)|failed.*GrandMaster\.fx).*$')
            if ($errs.Count -gt 0) { $res.ErrorLines = @($errs | ForEach-Object { $_.Value.Trim() }) }
        }
        if ($us) {
            $p = [regex]::Match($us, '(?im)^.*ReShade preset selected.*$')
            if ($p.Success) { $res.PresetSelected = $true; $res.PresetLine = $p.Value.Trim() }
        }
        if ($res.PresetSelected -and ($res.Compiled -or -not $ExpectGrandMaster -or $res.ErrorLines.Count -gt 0)) { break }
    }
    return $res
}

# Log text appended after OldLength, or the whole file if it was recreated after Since.
function Read-NewLogText {
    param([string]$Path, [long]$OldLength, [datetime]$Since)
    if (-not (Test-Path -LiteralPath $Path)) { return '' }
    $item = Get-Item -LiteralPath $Path
    $fs = [System.IO.File]::Open($Path, 'Open', 'Read', 'ReadWrite')
    try {
        $len = $fs.Length
        $from = $OldLength
        if ($len -lt $OldLength -or $item.CreationTime -gt $Since) { $from = 0 }
        if ($from -ge $len) { return '' }
        [void]$fs.Seek($from, 'Begin')
        $buf = New-Object byte[] ($len - $from)
        [void]$fs.Read($buf, 0, $buf.Length)
        return [System.Text.Encoding]::UTF8.GetString($buf)
    } finally { $fs.Dispose() }
}

function Get-LogLength {
    param([string]$Path)
    if (Test-Path -LiteralPath $Path) { return (Get-Item -LiteralPath $Path).Length }
    return 0
}

# Parses Unishade "State" lines: processing_ms, present_fps, capture_fps.
function Get-StateStats {
    param([Parameter(Mandatory)][AllowEmptyString()][string]$LogText)
    $rows = New-Object System.Collections.Generic.List[object]
    foreach ($line in ($LogText -split "`r?`n")) {
        if ($line -notmatch 'State') { continue }
        $pm = [regex]::Match($line, 'processing_ms\D{0,3}?([0-9]+(?:\.[0-9]+)?)')
        $pf = [regex]::Match($line, 'present_fps\D{0,3}?([0-9]+(?:\.[0-9]+)?)')
        $cf = [regex]::Match($line, 'capture_fps\D{0,3}?([0-9]+(?:\.[0-9]+)?)')
        if ($pm.Success -or $pf.Success) {
            $rows.Add([pscustomobject]@{
                processing_ms = $(if ($pm.Success) { [double]$pm.Groups[1].Value } else { [double]::NaN })
                present_fps   = $(if ($pf.Success) { [double]$pf.Groups[1].Value } else { [double]::NaN })
                capture_fps   = $(if ($cf.Success) { [double]$cf.Groups[1].Value } else { [double]::NaN })
            })
        }
    }
    function Summ($vals) {
        $v = @($vals | Where-Object { -not [double]::IsNaN($_) } | Sort-Object)
        if ($v.Count -eq 0) { return [pscustomobject]@{ n = 0; mean = [double]::NaN; median = [double]::NaN; p95 = [double]::NaN } }
        $mean = ($v | Measure-Object -Average).Average
        $med = $v[[int][math]::Floor(($v.Count - 1) / 2)]
        $p95 = $v[[int][math]::Min($v.Count - 1, [math]::Ceiling(0.95 * $v.Count) - 1)]
        return [pscustomobject]@{ n = $v.Count; mean = [math]::Round($mean, 3); median = $med; p95 = $p95 }
    }
    return [pscustomobject]@{
        Samples       = $rows.Count
        processing_ms = Summ ($rows | ForEach-Object { $_.processing_ms })
        present_fps   = Summ ($rows | ForEach-Object { $_.present_fps })
        capture_fps   = Summ ($rows | ForEach-Object { $_.capture_fps })
    }
}

# ---------------------------------------------------------------- input
$script:Win32Loaded = $false
function Initialize-Win32 {
    if ($script:Win32Loaded) { return }
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class GMWin32 {
    [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
    [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint code, uint mapType);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
    public static void Key(byte vk, bool up) {
        byte sc = (byte)MapVirtualKey(vk, 0);
        uint flags = up ? 2u : 0u;
        if (vk >= 0x21 && vk <= 0x2E) flags |= 1u;   // extended keys: PgUp..Delete, Home, End
        keybd_event(vk, sc, flags, UIntPtr.Zero);
    }
}
'@
    $script:Win32Loaded = $true
}

$script:VK = @{ CTRL = 0x11; SHIFT = 0x10; ALT = 0x12; HOME = 0x24; PGUP = 0x21; PGDN = 0x22; F7 = 0x76; F8 = 0x77; F9 = 0x78; F10 = 0x79 }

# Sends a chord such as 'CTRL+F9' or 'HOME' to the foreground window.
function Send-KeyChord {
    param([Parameter(Mandatory)][string]$Chord)
    Initialize-Win32
    $keys = @($Chord.ToUpper().Split('+') | ForEach-Object { $script:VK[$_.Trim()] })
    if ($keys -contains $null) { throw "Unknown key in chord '$Chord'" }
    foreach ($k in $keys) { [GMWin32]::Key([byte]$k, $false); Start-Sleep -Milliseconds 40 }
    Start-Sleep -Milliseconds 80
    [array]::Reverse($keys)
    foreach ($k in $keys) { [GMWin32]::Key([byte]$k, $true); Start-Sleep -Milliseconds 40 }
}

function Set-RobloxForeground {
    Initialize-Win32
    $p = Get-Process -Name 'RobloxPlayerBeta' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
    if (-not $p) { return $false }
    [void][GMWin32]::ShowWindow($p.MainWindowHandle, 9)
    return [GMWin32]::SetForegroundWindow($p.MainWindowHandle)
}

# ---------------------------------------------------------------- image metrics (fast, C#)
$script:MetricsLoaded = $false
function Initialize-Metrics {
    if ($script:MetricsLoaded) { return }
    Add-Type -TypeDefinition @'
using System;
public static class GMMetrics {
    // bgra: 4 bytes per pixel, row-major, stride = 4*w
    public static double[] Luma(byte[] bgra, int w, int h) {
        double[] L = new double[w * h];
        for (int i = 0, p = 0; i < w * h; i++, p += 4)
            L[i] = (0.0722 * bgra[p] + 0.7152 * bgra[p + 1] + 0.2126 * bgra[p + 2]) / 255.0;
        return L;
    }
    public static double[] MeanRGB(byte[] bgra, int w, int h) {
        double r = 0, g = 0, b = 0; int n = w * h;
        for (int i = 0, p = 0; i < n; i++, p += 4) { b += bgra[p]; g += bgra[p + 1]; r += bgra[p + 2]; }
        return new double[] { r / n, g / n, b / n };
    }
    // mean gradient magnitude of luma (same definition as the Linux harness)
    public static double EdgeEnergy(double[] L, int w, int h) {
        double s = 0; long n = 0;
        for (int y = 0; y < h - 1; y++)
            for (int x = 0; x < w - 1; x++) {
                double gx = Math.Abs(L[y * w + x + 1] - L[y * w + x]);
                double gy = Math.Abs(L[(y + 1) * w + x] - L[y * w + x]);
                s += Math.Sqrt(gx * gx + gy * gy); n++;
            }
        return n > 0 ? s / n : 0;
    }
    static double[] MinMax1D(double[] a, int w, int h, int r, bool horiz, bool isMax) {
        double[] o = new double[w * h];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++) {
                double v = isMax ? double.MinValue : double.MaxValue;
                for (int k = -r; k <= r; k++) {
                    int xx = horiz ? Math.Min(Math.Max(x + k, 0), w - 1) : x;
                    int yy = horiz ? y : Math.Min(Math.Max(y + k, 0), h - 1);
                    double t = a[yy * w + xx];
                    v = isMax ? Math.Max(v, t) : Math.Min(v, t);
                }
                o[y * w + x] = v;
            }
        return o;
    }
    // halo/ringing: overshoot of 'after' beyond the 'before' local [min,max] (7x7) at strong edges
    public static double[] Halo(double[] Lb, double[] La, int w, int h, int r, double edgeThr) {
        double[] mn = MinMax1D(MinMax1D(Lb, w, h, r, true, false), w, h, r, false, false);
        double[] mx = MinMax1D(MinMax1D(Lb, w, h, r, true, true), w, h, r, false, true);
        double s = 0; long n = 0; System.Collections.Generic.List<double> vals = new System.Collections.Generic.List<double>();
        for (int i = 0; i < w * h; i++) {
            if (mx[i] - mn[i] <= edgeThr) continue;
            double o = Math.Max(La[i] - mx[i], 0) + Math.Max(mn[i] - La[i], 0);
            s += o; n++; vals.Add(o);
        }
        if (n == 0) return new double[] { 0, 0 };
        vals.Sort();
        return new double[] { s / n, vals[(int)Math.Min(vals.Count - 1, Math.Ceiling(0.999 * vals.Count) - 1)] };
    }
    // returns mean abs diff and fills a x4 amplified diff image (bgra)
    public static double Diff(byte[] a, byte[] b, byte[] outBgra, int w, int h) {
        double s = 0;
        for (int i = 0, p = 0; i < w * h; i++, p += 4) {
            for (int c = 0; c < 3; c++) {
                int d = Math.Abs(a[p + c] - b[p + c]); s += d;
                outBgra[p + c] = (byte)Math.Min(255, d * 4);
            }
            outBgra[p + 3] = 255;
        }
        return s / (3.0 * w * h);
    }
}
'@
    $script:MetricsLoaded = $true
}

# Loads an image file into a BGRA byte array (Windows: System.Drawing).
function Read-ImageBgra {
    param([Parameter(Mandatory)][string]$Path)
    Add-Type -AssemblyName System.Drawing
    $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Path).Path)
    try {
        $rect = New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
        $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $bytes = New-Object byte[] ($bmp.Width * $bmp.Height * 4)
            for ($y = 0; $y -lt $bmp.Height; $y++) {
                [System.Runtime.InteropServices.Marshal]::Copy([IntPtr]($data.Scan0.ToInt64() + $y * $data.Stride), $bytes, $y * $bmp.Width * 4, $bmp.Width * 4)
            }
        } finally { $bmp.UnlockBits($data) }
        return [pscustomobject]@{ Width = $bmp.Width; Height = $bmp.Height; Bgra = $bytes }
    } finally { $bmp.Dispose() }
}

function Write-ImageBgra {
    param([Parameter(Mandatory)][string]$Path, [int]$Width, [int]$Height, [byte[]]$Bgra)
    Add-Type -AssemblyName System.Drawing
    $bmp = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $rect = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
        $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            for ($y = 0; $y -lt $Height; $y++) {
                [System.Runtime.InteropServices.Marshal]::Copy($Bgra, $y * $Width * 4, [IntPtr]($data.Scan0.ToInt64() + $y * $data.Stride), $Width * 4)
            }
        } finally { $bmp.UnlockBits($data) }
        $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $bmp.Dispose() }
}

# Compares a before/after pair of raw BGRA buffers. Returns the metrics object.
function Compare-Bgra {
    param([int]$Width, [int]$Height, [byte[]]$Before, [byte[]]$After, [string]$DiffPath)
    Initialize-Metrics
    $Lb = [GMMetrics]::Luma($Before, $Width, $Height)
    $La = [GMMetrics]::Luma($After, $Width, $Height)
    $diffImg = New-Object byte[] ($Width * $Height * 4)
    $mad = [GMMetrics]::Diff($Before, $After, $diffImg, $Width, $Height)
    if ($DiffPath) { Write-ImageBgra -Path $DiffPath -Width $Width -Height $Height -Bgra $diffImg }
    $halo = [GMMetrics]::Halo($Lb, $La, $Width, $Height, 3, 0.25)
    $mb = [GMMetrics]::MeanRGB($Before, $Width, $Height)
    $ma = [GMMetrics]::MeanRGB($After, $Width, $Height)
    return [pscustomobject]@{
        mean_rgb_before = @([math]::Round($mb[0], 2), [math]::Round($mb[1], 2), [math]::Round($mb[2], 2))
        mean_rgb_after  = @([math]::Round($ma[0], 2), [math]::Round($ma[1], 2), [math]::Round($ma[2], 2))
        edge_energy_before = [math]::Round([GMMetrics]::EdgeEnergy($Lb, $Width, $Height), 5)
        edge_energy_after  = [math]::Round([GMMetrics]::EdgeEnergy($La, $Width, $Height), 5)
        mean_abs_diff = [math]::Round($mad, 3)
        halo_mean = [math]::Round($halo[0], 5)
        halo_p999 = [math]::Round($halo[1], 4)
    }
}

Export-ModuleMember -Function *

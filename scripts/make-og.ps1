# Regenerates public/og.png (1200x630 social preview). Windows only (System.Drawing).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/make-og.ps1
Add-Type -AssemblyName System.Drawing
$w = 1200; $h = 630
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear([System.Drawing.Color]::FromArgb(13, 17, 23))

$green = [System.Drawing.Color]::FromArgb(63, 185, 80)
$blue = [System.Drawing.Color]::FromArgb(88, 166, 255)
$text = [System.Drawing.Color]::FromArgb(230, 237, 243)
$muted = [System.Drawing.Color]::FromArgb(154, 165, 177)

$pen = New-Object System.Drawing.Pen $green, 22
$pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
$g.DrawLines($pen, [System.Drawing.Point[]]@((New-Object System.Drawing.Point 90, 150), (New-Object System.Drawing.Point 135, 195), (New-Object System.Drawing.Point 225, 100)))

$mono = 'Consolas'
$g.DrawString('// test suite: about_me.spec', (New-Object System.Drawing.Font $mono, 26), (New-Object System.Drawing.SolidBrush $blue), 86, 250)
$g.DrawString('Ujjwal Bisht', (New-Object System.Drawing.Font 'Segoe UI', 84, ([System.Drawing.FontStyle]::Bold)), (New-Object System.Drawing.SolidBrush $text), 76, 290)
$g.DrawString('Associate Software Engineer | QA Automation | Problem Solver', (New-Object System.Drawing.Font 'Segoe UI', 30), (New-Object System.Drawing.SolidBrush $muted), 86, 445)
$g.DrawString([char]0x2713 + ' 4 passing   0 flaky', (New-Object System.Drawing.Font $mono, 28, ([System.Drawing.FontStyle]::Bold)), (New-Object System.Drawing.SolidBrush $green), 86, 530)

$out = Join-Path $PSScriptRoot '..\public\og.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "Wrote $out"

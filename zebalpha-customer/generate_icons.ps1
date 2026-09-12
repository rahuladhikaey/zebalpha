Add-Type -AssemblyName System.Drawing

$srcPath = "d:\Full Folder 77\zebalpha-customer\public\official-logo.png"
$baseRes = "d:\Full Folder 77\zebalpha-customer\android\app\src\main\res"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcImage = [System.Drawing.Bitmap]::FromFile($srcPath)

$configs = @(
    @{ Folder = "mipmap-mdpi";     Square = 48;  Fg = 108 },
    @{ Folder = "mipmap-hdpi";     Square = 72;  Fg = 162 },
    @{ Folder = "mipmap-xhdpi";    Square = 96;  Fg = 216 },
    @{ Folder = "mipmap-xxhdpi";   Square = 144; Fg = 324 },
    @{ Folder = "mipmap-xxxhdpi";  Square = 192; Fg = 432 }
)

function Resize-Square ($src, $targetPath, $size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Resize-Round ($src, $targetPath, $size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)

    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Resize-Foreground ($src, $targetPath, $fgSize) {
    $bmp = New-Object System.Drawing.Bitmap($fgSize, $fgSize)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Safe zone for adaptive icons is center 66%
    $innerSize = [int]($fgSize * 0.66)
    $offset = [int](($fgSize - $innerSize) / 2)

    $g.DrawImage($src, $offset, $offset, $innerSize, $innerSize)
    $g.Dispose()
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

foreach ($cfg in $configs) {
    $dir = Join-Path $baseRes $cfg.Folder
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    $squarePath = Join-Path $dir "ic_launcher.png"
    $roundPath  = Join-Path $dir "ic_launcher_round.png"
    $fgPath     = Join-Path $dir "ic_launcher_foreground.png"

    Resize-Square $srcImage $squarePath $cfg.Square
    Resize-Round $srcImage $roundPath $cfg.Square
    Resize-Foreground $srcImage $fgPath $cfg.Fg

    Write-Host "Generated launcher icons for $($cfg.Folder) (Square: $($cfg.Square)x$($cfg.Square), Fg: $($cfg.Fg)x$($cfg.Fg))"
}

$srcImage.Dispose()
Write-Host "All Android launcher icons updated successfully with official logo!"

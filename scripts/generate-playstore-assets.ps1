Add-Type -AssemblyName System.Drawing

$assetsDir = "d:\Full Folder 77\playstore-assets"
$logoPath = "d:\Full Folder 77\zebalpha-customer\public\official-logo.png"

if (!(Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
}

$screensDir = Join-Path $assetsDir "screenshots"
if (!(Test-Path $screensDir)) {
    New-Item -ItemType Directory -Force -Path $screensDir | Out-Null
}

Write-Host "Creating 512x512 Play Store App Icon..."
$iconSize = 512
$iconBmp = New-Object System.Drawing.Bitmap($iconSize, $iconSize)
$gIcon = [System.Drawing.Graphics]::FromImage($iconBmp)
$gIcon.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gIcon.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gIcon.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Dark luxury background
$brushBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 5, 5, 5))
$gIcon.FillRectangle($brushBg, 0, 0, $iconSize, $iconSize)

# Subtle rounded inner glow
$penBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 255, 255, 255), 2)
$gIcon.DrawRectangle($penBorder, 2, 2, $iconSize - 4, $iconSize - 4)

if (Test-Path $logoPath) {
    $logoBmp = [System.Drawing.Bitmap]::FromFile($logoPath)
    $innerSize = 380
    $offset = [int](($iconSize - $innerSize) / 2)
    $gIcon.DrawImage($logoBmp, $offset, $offset, $innerSize, $innerSize)
    $logoBmp.Dispose()
}

$iconOut = Join-Path $assetsDir "playstore_icon_512x512.png"
$iconBmp.Save($iconOut, [System.Drawing.Imaging.ImageFormat]::Png)
$gIcon.Dispose()
$iconBmp.Dispose()
Write-Host " -> Created $iconOut"

Write-Host "Creating 1024x500 Play Store Feature Graphic Banner..."
$featW = 1024
$featH = 500
$featBmp = New-Object System.Drawing.Bitmap($featW, $featH)
$gFeat = [System.Drawing.Graphics]::FromImage($featBmp)
$gFeat.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gFeat.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gFeat.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gFeat.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Solid dark gradient background
$rect = New-Object System.Drawing.Rectangle(0, 0, $featW, $featH)
$color1 = [System.Drawing.Color]::FromArgb(255, 5, 5, 5)
$color2 = [System.Drawing.Color]::FromArgb(255, 20, 20, 22)
$linGrBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $color1, $color2, 45)
$gFeat.FillRectangle($linGrBrush, $rect)

# Draw decorative luxury accent grid or circles
$penAccent = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(20, 255, 255, 255), 1)
$gFeat.DrawEllipse($penAccent, -100, -100, 700, 700)
$gFeat.DrawEllipse($penAccent, 600, 100, 500, 500)

# Draw Brand Logo
if (Test-Path $logoPath) {
    $logoBmp = [System.Drawing.Bitmap]::FromFile($logoPath)
    $logoSize = 220
    $logoX = [int](($featW - $logoSize) / 2)
    $logoY = 60
    $gFeat.DrawImage($logoBmp, $logoX, $logoY, $logoSize, $logoSize)
    $logoBmp.Dispose()
}

# Typography
$fontTitle = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Regular)
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$brushMuted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 180, 180, 180))

$formatCenter = New-Object System.Drawing.StringFormat
$formatCenter.Alignment = [System.Drawing.StringAlignment]::Center

$gFeat.DrawString("ZEBALPHA", $fontTitle, $brushWhite, [float]($featW / 2), 300, $formatCenter)
$gFeat.DrawString("EXCLUSIVE STREETWEAR & CONTEMPORARY FASHION", $fontSub, $brushMuted, [float]($featW / 2), 360, $formatCenter)

# Accent badge
$badgeFont = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$brushGold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 220, 180, 90))
$gFeat.DrawString("✦ OFFICIAL ANDROID APP ✦", $badgeFont, $brushGold, [float]($featW / 2), 410, $formatCenter)

$featOut = Join-Path $assetsDir "playstore_feature_graphic_1024x500.png"
$featBmp.Save($featOut, [System.Drawing.Imaging.ImageFormat]::Png)
$gFeat.Dispose()
$featBmp.Dispose()
Write-Host " -> Created $featOut"

# Copy existing screenshots
$srcScreens = "d:\Full Folder 77\docs\ui-ux-backups\pre-diwali-2026\screenshots"
if (Test-Path $srcScreens) {
    Get-ChildItem -Path $srcScreens -Filter "android_app*.png" | ForEach-Object {
        $dest = Join-Path $screensDir $_.Name
        Copy-Item -Path $_.FullName -Destination $dest -Force
        Write-Host " -> Copied Screenshot: $($_.Name)"
    }
}

Write-Host "`nAll Google Play Store graphics generated in: $assetsDir"

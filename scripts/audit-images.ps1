# Zebalpha Image Optimization Audit & Verification Script
# Strict Maximum Limit: 158,720 bytes (155 KiB)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot
if (-not $rootDir) { $rootDir = "D:\Full Folder 77" }

$MAX_ALLOWED_BYTES = 158720
$MAX_KB = [math]::Round($MAX_ALLOWED_BYTES / 1024, 2)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "    ZEBALPHA PLATFORM - IMAGE OPTIMIZATION AUDIT (155 KB LIMIT)  " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Root Directory      : $rootDir"
Write-Host "Maximum Size Limit  : $MAX_ALLOWED_BYTES bytes ($MAX_KB KB)"
Write-Host ""

$excludePatterns = @("node_modules", "[\\/]git[\\/]", "[\\/]\.next[\\/]", "image_backups_pre_optimization", "[\\/]dist[\\/]", "[\\/]build[\\/]")
$imageExtensions = @(".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif")

$allFiles = Get-ChildItem -Path $rootDir -Recurse -File | Where-Object {
    $filePath = $_.FullName
    $ext = $_.Extension.ToLower()
    if ($imageExtensions -notcontains $ext) { return $false }
    
    foreach ($pattern in $excludePatterns) {
        if ($filePath -match $pattern) { return $false }
    }
    return $true
}

$totalScanned = 0
$compliantCount = 0
$oversizedCount = 0
$oversizedList = @()

$report = foreach ($file in $allFiles) {
    $totalScanned++
    $sizeBytes = $file.Length
    $sizeKb = [math]::Round($sizeBytes / 1024, 2)
    $isOversized = $sizeBytes -gt $MAX_ALLOWED_BYTES
    $relPath = $file.FullName.Replace($rootDir, "").TrimStart("\/")

    if ($isOversized) {
        $oversizedCount++
        $oversizedList += [PSCustomObject]@{
            Path = $relPath
            SizeBytes = $sizeBytes
            SizeKB = $sizeKb
        }
    } else {
        $compliantCount++
    }

    [PSCustomObject]@{
        Name = $file.Name
        Extension = $file.Extension.ToUpper()
        SizeBytes = $sizeBytes
        SizeKB = $sizeKb
        Status = if ($isOversized) { "VIOLATION" } else { "COMPLIANT" }
        Path = $relPath
    }
}

$report | Sort-Object SizeBytes -Descending | Format-Table -Property Name, Extension, SizeBytes, SizeKB, Status, Path -AutoSize

Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "AUDIT SUMMARY:" -ForegroundColor Yellow
Write-Host "  Total Raster Images Scanned : $totalScanned"
Write-Host "  Compliant (<= 158,720 bytes): $compliantCount"
Write-Host "  Violations (> 158,720 bytes) : $oversizedCount"
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan

if ($oversizedCount -gt 0) {
    Write-Host "[FAIL] Audit FAILED! The following images exceed the 155 KB limit:" -ForegroundColor Red
    $oversizedList | ForEach-Object {
        Write-Host "  - $($_.Path) : $($_.SizeBytes) bytes ($($_.SizeKB) KB)" -ForegroundColor Red
    }
    exit 1
} else {
    Write-Host "[SUCCESS] 100% of scanned raster images strictly adhere to the 155 KB limit!" -ForegroundColor Green
    exit 0
}

<#
.SYNOPSIS
  2026-07-23 — Desktop "픽미톡 ai\{slug}\front" 폴더 생성 + 정면 후보 정리

.DESCRIPTION
  1) Desktop\픽미톡 ai\{yuna|narin|yunseo|eunha|jiyu}\front 생성
  2) 소스 폴더의 이미지를 {slug}_front_001.jpg … 로 복사 (최대 20)
  3) front\README.txt 기록

.PARAMETER SourceRoot
  생성된 이미지가 있는 루트. 기본: Downloads\PickMeTalk_MJ 또는 인자.

.EXAMPLE
  .\scripts\organize-desktop-front.ps1
  .\scripts\organize-desktop-front.ps1 -SourceRoot "D:\PickMeTalk_PhotoLibrary\master"
  .\scripts\organize-desktop-front.ps1 -SourceRoot "C:\Users\user\Downloads\PickMeTalk_MJ" -MaxPerChar 20
#>
param(
  [string]$DesktopAi = "C:\Users\user\OneDrive\Desktop\픽미톡 ai",
  [string]$SourceRoot = "",
  [int]$MaxPerChar = 20,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$slugs = @("yuna", "narin", "yunseo", "eunha", "jiyu")
$exts = @("*.jpg", "*.jpeg", "*.png", "*.webp")

function Ensure-Dir($path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    Write-Host "Created $path"
  }
}

Write-Host "=== PickMeTalk front candidates organize ==="
Write-Host "Desktop AI: $DesktopAi"

Ensure-Dir $DesktopAi

foreach ($slug in $slugs) {
  $front = Join-Path $DesktopAi "$slug\front"
  Ensure-Dir (Join-Path $DesktopAi $slug)
  Ensure-Dir $front
}

if (-not $SourceRoot) {
  Write-Host ""
  Write-Host "Folders ready. To copy images, re-run with -SourceRoot:"
  Write-Host '  .\scripts\organize-desktop-front.ps1 -SourceRoot "C:\Users\user\Downloads\PickMeTalk_MJ"'
  Write-Host ""
  Write-Host "Manual: put front-only images into each front\ folder as {slug}_front_001.jpg …"
  exit 0
}

if (-not (Test-Path $SourceRoot)) {
  throw "SourceRoot not found: $SourceRoot"
}

$report = @()

foreach ($slug in $slugs) {
  $front = Join-Path $DesktopAi "$slug\front"
  $candidates = @()

  # Prefer slug-named subfolder, else scan SourceRoot for *slug*
  $slugDir = Join-Path $SourceRoot $slug
  $searchRoots = @()
  if (Test-Path $slugDir) { $searchRoots += $slugDir }
  $searchRoots += $SourceRoot

  foreach ($root in $searchRoots) {
    foreach ($pat in $exts) {
      $candidates += Get-ChildItem -Path $root -Filter $pat -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match [regex]::Escape($slug) -or $root -eq $slugDir }
    }
  }

  # Dedupe by full path
  $candidates = $candidates | Sort-Object FullName -Unique | Select-Object -First $MaxPerChar

  $i = 0
  foreach ($file in $candidates) {
    $i++
    $destName = "{0}_front_{1:D3}{2}" -f $slug, $i, $file.Extension.ToLower()
    $dest = Join-Path $front $destName
    if ($DryRun) {
      Write-Host "[dry] $($file.FullName) -> $dest"
    } else {
      Copy-Item -Path $file.FullName -Destination $dest -Force
      Write-Host "Copied $destName"
    }
  }

  $count = (Get-ChildItem -Path $front -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png|webp)$' }).Count
  $readme = Join-Path $front "README.txt"
  $line = "생성일 $(Get-Date -Format 'yyyy-MM-dd') · front 후보 총 ${count}장 · 캐릭터 미확정 · heroPhoto 변경 금지"
  if (-not $DryRun) {
    Set-Content -Path $readme -Value $line -Encoding UTF8
  }
  $report += [pscustomobject]@{ slug = $slug; frontCount = $count; path = $front }
}

Write-Host ""
Write-Host "=== Summary ==="
$report | Format-Table -AutoSize
$missing = $report | Where-Object { $_.frontCount -lt $MaxPerChar }
if ($missing) {
  Write-Host "Incomplete (< $MaxPerChar): $($missing.slug -join ', ')"
} else {
  Write-Host "All characters have $MaxPerChar+ files in front\"
}

Write-Host ""
Write-Host 'Done. Optional log:'
Write-Host 'python C:\Users\user\OneDrive\Desktop\sun\scripts\log_activity.py pickmetalk "7/23: 5캐릭터 front 후보 +20장 Desktop 정리"'

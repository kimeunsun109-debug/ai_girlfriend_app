<#
.SYNOPSIS
  Rename local PickMeTalk folders and fix git remotes after GitHub rename.

.NOTES
  1) Rename GitHub repos in the browser FIRST (see docs/RENAME_PICKMETALK.md)
  2) Close Cursor windows using the old folders
  3) Run this script in PowerShell
#>

$ErrorActionPreference = "Stop"

function Rename-IfExists($from, $to) {
  if (Test-Path $to) {
    Write-Host "Already exists: $to"
    return
  }
  if (Test-Path $from) {
    Rename-Item -Path $from -NewName (Split-Path $to -Leaf)
    Write-Host "Renamed $from -> $to"
  } else {
    Write-Host "Skip (missing): $from"
  }
}

Rename-IfExists "C:\Users\user\app_girl-friend" "C:\Users\user\pickmetalk"
Rename-IfExists "C:\Users\user\ai_girlfriend_app" "C:\Users\user\pickmetalk-ops"

if (Test-Path "C:\Users\user\pickmetalk\.git") {
  Push-Location "C:\Users\user\pickmetalk"
  git remote set-url origin "https://github.com/kimeunsun109-debug/pickmetalk.git"
  Write-Host "Product remote:"
  git remote -v
  Pop-Location
}

if (Test-Path "C:\Users\user\pickmetalk-ops\.git") {
  Push-Location "C:\Users\user\pickmetalk-ops"
  git remote set-url origin "https://github.com/kimeunsun109-debug/pickmetalk-ops.git"
  Write-Host "Ops remote:"
  git remote -v
  Pop-Location
}

Write-Host ""
Write-Host "Done. Re-open folders in Cursor:"
Write-Host "  C:\Users\user\pickmetalk"
Write-Host "  C:\Users\user\pickmetalk-ops"

# PickMeTalk — 로컬 변경사항 백업 후 GitHub main 동기화
# Windows에서 실행: powershell -ExecutionPolicy Bypass -File scripts/backup-local-before-sync.ps1

$ProjectRoot = "C:\Users\user\ai_girlfriend_app"
$BackupRoot  = "C:\Users\user\ai_girlfriend_app_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

if (-not (Test-Path $ProjectRoot)) {
    Write-Error "프로젝트 경로 없음: $ProjectRoot"
    exit 1
}

Set-Location $ProjectRoot

# 1. 현재 상태 확인
Write-Host "`n=== git status ===" -ForegroundColor Cyan
git status

# 2. 변경/미추적 파일 백업
$hasChanges = (git status --porcelain)
if ($hasChanges) {
    Write-Host "`n=== 로컬 변경 발견 — 백업 생성: $BackupRoot ===" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

    # 변경된 tracked 파일
    git diff --name-only | ForEach-Object {
        $dest = Join-Path $BackupRoot $_
        $dir  = Split-Path $dest -Parent
        if ($dir) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Copy-Item (Join-Path $ProjectRoot $_) $dest -Force -ErrorAction SilentlyContinue
    }

    # staged 파일
    git diff --cached --name-only | ForEach-Object {
        $dest = Join-Path $BackupRoot $_
        $dir  = Split-Path $dest -Parent
        if ($dir) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Copy-Item (Join-Path $ProjectRoot $_) $dest -Force -ErrorAction SilentlyContinue
    }

    # untracked (민감 파일 제외)
    git ls-files --others --exclude-standard | Where-Object {
        $_ -notmatch '\.env|node_modules|cache|catalog\.db|\.next'
    } | ForEach-Object {
        $dest = Join-Path $BackupRoot $_
        $dir  = Split-Path $dest -Parent
        if ($dir) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Copy-Item (Join-Path $ProjectRoot $_) $dest -Force -ErrorAction SilentlyContinue
    }

    git status --porcelain | Out-File (Join-Path $BackupRoot "git-status.txt")
    Write-Host "백업 완료: $BackupRoot" -ForegroundColor Green
} else {
    Write-Host "`n로컬 변경 없음 — 백업 생략" -ForegroundColor Green
}

# 3. GitHub main 최신 pull
Write-Host "`n=== git pull origin main ===" -ForegroundColor Cyan
git fetch origin
$pull = git pull origin main 2>&1
Write-Host $pull

if ($pull -match 'CONFLICT') {
    Write-Host "`n⚠️  충돌 발생 — 자동 덮어쓰기 하지 않음" -ForegroundColor Red
    git diff --name-only --diff-filter=U
    Write-Host "백업 위치: $BackupRoot"
    exit 1
}

Write-Host "`n✓ main 동기화 완료 (PR #10 포함)" -ForegroundColor Green

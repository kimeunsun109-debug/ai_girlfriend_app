# Midjourney Production Pipeline

운영용 Midjourney → Photo Library 자동 구축 시스템.

## Runtime 분리 (Production vs Test)

| Runtime | OS | Photo Library | Import Watch |
|---------|-----|---------------|--------------|
| `production` | **Windows only** | `D:\PickMeTalk_PhotoLibrary` | `%USERPROFILE%\Downloads\PickMeTalk_MJ` |
| `test` | Cloud/Linux OK | `test-fixtures/photo-library` | `test-fixtures/mj-import` |

```bash
# 운영 (Windows PC)
PICKMETALK_RUNTIME=production npm run mj:init
PICKMETALK_RUNTIME=production npm run mj:ready

# Cloud 테스트
PICKMETALK_RUNTIME=test npm run mj:yuna-test
```

Linux에서 `/workspace/D:/PickMeTalk...` 같은 hybrid 경로는 **생성되지 않습니다**.

## Production Ready 체크

```powershell
npm run mj:init
npm run mj:ready
# 또는
npm run mj:production -- --ready
```

체크리스트 항목: Windows OS, D:\ 경로, 5캐릭터 폴더, Watch Folder, Ingest 파이프라인

## Production Mode (장기 운영)

```powershell
# Phase 1: 캐릭터당 100~200장 (기본 150)
$env:MJ_PRODUCTION_MODE="production"
$env:MJ_PRODUCTION_PHASE="150"
$env:PHOTO_UNIVERSE_ENABLED="true"

npm run mj:init
npm run mj:production          # orchestrator + import watch
npm run mj:production -- --stats   # 품질/얼굴 통계만
npm run mj:production -- --once    # 1회 tick 후 종료
```

**Scale tiers:** `20 → 100 → 200 → 500 → 1000 → 2000 → 5000`  
통계 게이트 통과 후 `MJ_PRODUCTION_PHASE` 를 다음 tier 로 올립니다.

| 기능 | 설명 |
|------|------|
| Error resilience | ingest 오류 시 로그 + 다음 job 진행 |
| Auto-regen | face/quality reject → `regenerate` → 자동 재큐 (max 3회) |
| Runtime scenes | Catalog 소진 시 Image Factory 로 신규 Scene 생성 |
| Top-up | 완료 수가 phase target 미만이면 job 자동 추가 |

테스트 모드(`mj:yuna-test`, 20장)는 그대로 유지됩니다.

### 5캐릭터 Manifest 생성

```bash
# 5캐릭터 × 20장 MJ 명령 manifest (Discord 복사용)
npm run mj:characters-manifest

# 캐릭터당 150장 (production phase)
npm run mj:characters-manifest -- --count=150

# 특정 캐릭터만
npm run mj:characters-manifest -- --character=narin --count=20
```

산출물: `data/photo-universe/characters-manifest/{slug}/`

## Quick Start (Windows)

```powershell
# 1. USB 폴더 구조 생성
npm run mj:init

# 2. Production Queue 생성 (캐릭터당 150장 — production 기본)
npm run mj:queue -- --count=150

# 3. 파이프라인 실행 (import 감시 + dashboard)
npm run mj:pipeline -- --count=150
```

Dashboard: http://localhost:3000/production.html

## Workflow

```
Prompt Catalog (미사용 랜덤) → MJ Discord 수동 생성 → Downloads/PickMeTalk_MJ 에 저장
    → 자동 ingest → 품질/얼굴 검사 → D:\PickMeTalk_PhotoLibrary\{char}\{folder}\
    → SQLite Catalog + Thumbnail + Review Queue
```

## Face Verification

| 유사도 | 처리 |
|--------|------|
| ≥ 95% | AUTO APPROVE → ACTIVE |
| 80–95% | REVIEW → `_review/` + 검토 목록 |
| < 80% | REJECT → `_rejected/` + regenerate |

기준 얼굴: `data/photo-universe/face-references/{character}/` 에 reference 이미지 배치

## 확장

```env
MJ_PRODUCTION_PHASE=150        # 현재 운영 단계 (100~200 권장 시작)
MJ_PHOTOS_PER_CHARACTER=150    # run 당 목표 (phase 와 동일하게)
MJ_MAX_RETRIES=3               # 재생성 최대 횟수
MJ_RUNTIME_SCENES=true         # catalog 소진 시 자동 scene 생성
MJ_CONTINUE_ON_ERROR=true      # 오류 시 중단하지 않음
```

코드 변경 없이 env/CLI `--count=` / `--phase=` 만 조정.

## API

| Method | Endpoint |
|--------|----------|
| POST | `/api/production/bootstrap` |
| POST | `/api/production/queue` |
| POST | `/api/production/orchestrator/tick` |
| GET | `/api/production/stats` |
| GET | `/api/production/events` |
| GET | `/api/production/dashboard` |
| POST | `/api/production/queue/next` |
| GET | `/api/production/review` |
| POST | `/api/production/watch/start` |

## Scripts

| Script | 설명 |
|--------|------|
| `mj:ready` | **Production Ready 체크리스트** |
| `mj:init` | D:\PickMeTalk_PhotoLibrary 폴더 생성 |
| `mj:production` | **운영 orchestrator** (top-up, regen, stats) |
| `mj:queue` | Queue 생성 + 첫 MJ 프롬프트 출력 |
| `mj:pipeline` | Queue + import watch + library watch |
| `mj:dashboard` | 콘솔 진행률 |
| `mj:yuna-test` | 유나 20장 테스트 (test mode) |
| `mj:characters-manifest` | **5캐릭터 MJ manifest** (Discord 명령 MD + JSON) |

## Metadata Sidecar

```json
{
  "photoId": "yuna_000001",
  "character": "yuna",
  "category": "cafe",
  "prompt": "...",
  "faceVerified": true,
  "faceSimilarity": 96.5,
  "qualityScore": 82
}
```

See also: [PHOTO_UNIVERSE.md](./PHOTO_UNIVERSE.md)

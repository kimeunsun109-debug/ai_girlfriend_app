# Midjourney Production Pipeline

운영용 Midjourney → Photo Library 자동 구축 시스템.

## Quick Start (Windows)

```powershell
# 1. USB 폴더 구조 생성
npm run mj:init

# 2. Production Queue 생성 (캐릭터당 20장)
npm run mj:queue -- --count=20

# 3. 파이프라인 실행 (import 감시 + dashboard)
npm run mj:pipeline -- --count=20
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
MJ_PHOTOS_PER_CHARACTER=500   # 20 → 500 → 5000
```

코드 변경 없이 env/CLI `--count=` 만 조정.

## API

| Method | Endpoint |
|--------|----------|
| POST | `/api/production/bootstrap` |
| POST | `/api/production/queue` |
| GET | `/api/production/dashboard` |
| POST | `/api/production/queue/next` |
| GET | `/api/production/review` |
| POST | `/api/production/watch/start` |

## Scripts

| Script | 설명 |
|--------|------|
| `mj:init` | D:\PickMeTalk_PhotoLibrary 폴더 생성 |
| `mj:queue` | Queue 생성 + 첫 MJ 프롬프트 출력 |
| `mj:pipeline` | Queue + import watch + library watch |
| `mj:dashboard` | 콘솔 진행률 |

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

# PickMeTalk Photo Universe

> **"살아있는 AI 캐릭터들의 사진 세계"** — 이미지는 USB에, 프로젝트는 메타데이터·카탈로그·캐시만 관리합니다.

## 핵심 원칙

| 항목 | 위치 |
|------|------|
| **원본 이미지** | `D:\PickMeTalk_PhotoLibrary\` (USB) |
| **SQLite 카탈로그** | `data/photo-universe/catalog.db` |
| **썸네일 캐시** | `data/photo-universe/cache/thumbnails/` |
| **JSON 인덱스** | `data/photo-universe/indexes/{character}/` |
| **프롬프트** | `assets/prompts/` (Prompt Catalog) |

프로젝트 `assets/photos/`에는 **이미지를 저장하지 않습니다** (레거시 dev용만).

## USB 폴더 구조

```
D:\PickMeTalk_PhotoLibrary\
  yuna\
    cafe\
      a1b2c3d4e5f6g7h8.jpg
      a1b2c3d4e5f6g7h8.meta.json   ← 자동 생성
    home\
    travel\
    gym\
  narin\
  yunseo\
  eunha\
  jiyu\
  _inbox\          ← MJ 다운로드 드롭존 (선택)
```

## Midjourney Workflow

```
Prompt Catalog → Midjourney (Discord) → 다운로드 → USB 저장 → 자동 스캔/등록
```

### 1. 프롬프트 받기 (캐시 미스 시)

```bash
npm run universe:prompt -- yuna cafe shy
```

- **Cache HIT**: 라이브러리에 이미 있으면 URL 반환 → MJ 생성 불필요
- **Cache MISS**: Identity Lock 포함 MJ 명령어 출력

### 2. Midjourney에서 생성

- Discord MJ 봇에 `/imagine prompt: ...` 붙여넣기
- **얼굴 일관성**: 동일 캐릭터는 `--cref` / 시드 / Identity Lock 프롬프트 유지
- Upscale 후 다운로드

### 3. USB에 저장

```
D:\PickMeTalk_PhotoLibrary\yuna\cafe\{filename}.jpg
```

### 4. 자동 등록

```bash
# 일회 스캔
npm run universe:scan

# 실시간 감시 (권장 — MJ 다운로드 후 자동 등록)
npm run universe:watch
```

## 환경 변수

```env
PHOTO_LIBRARY_ROOT=D:/PickMeTalk_PhotoLibrary
PHOTO_UNIVERSE_ENABLED=true
PHOTO_UNIVERSE_DATA_ROOT=./data/photo-universe
UNIVERSE_MIN_SHORT_EDGE=720
UNIVERSE_MIN_QUALITY=55
```

## 메타데이터 (`.meta.json`)

각 이미지 옆에 자동 생성:

```json
{
  "id": "yuna_000245",
  "character": "yuna",
  "location": "cafe",
  "time": "afternoon",
  "weather": "cloudy",
  "emotion": "shy",
  "pose": "looking window",
  "camera": "iphone selfie",
  "lighting": "warm",
  "season": "autumn",
  "outfit": "knit",
  "generatedBy": "Midjourney",
  "prompt": "...",
  "qualityScore": 82,
  "usedCount": 0
}
```

수동 sidecar를 미리 두면 스캔 시 병합됩니다.

## 품질 검사 (자동)

| 검사 | 설명 |
|------|------|
| 해상도 | shortest edge ≥ 720px |
| 흐림 | Laplacian variance |
| 중복 | SHA-256 content hash |
| 유사 구도 | perceptual dHash (Hamming ≤ 6) |
| AI 느낌 | 채널 variance 휴리스틱 |
| 얼굴 | 중앙 영역 edge density (ML 없이 proxy) |

거부된 파일: `data/photo-universe/rejected/rejected-log.json`

## Cache-first 검색

```bash
GET /api/universe/cache/lookup?character=yuna&location=cafe&emotion=shy&time=afternoon
```

1. SQLite 카탈로그 검색
2. **HIT** → `/library/yuna/cafe/xxx.jpg` URL 반환
3. **MISS** → Midjourney 프롬프트 제안

## API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/universe/stats` | 전체 통계 |
| GET | `/api/universe/search?character=yuna&location=cafe&emotion=shy` | 고급 검색 |
| GET | `/api/universe/cache/lookup?...` | Cache-first |
| GET | `/api/universe/midjourney/prompt?character=yuna&category=cafe` | MJ 프롬프트 |
| POST | `/api/universe/scan` | 수동 스캔 |
| GET | `/library/{character}/{category}/{file}.jpg` | 원본 서빙 |
| GET | `/universe/thumbnails/...` | 썸네일 |

## Living AI / Push 연동

`PHOTO_UNIVERSE_ENABLED=true` 시:

- `PhotoCatalogRepository.selectPhoto()` → SQLite 카탈로그 우선
- Living AI `photo-push-selector` → 동일 파이프라인
- 아침/비/크리스마스 등 상황별 `categorySlug` → universe 검색

## 확장성 (10만+ 장)

- **SQLite WAL** + 인덱스 (character, location, emotion, quality)
- 캐릭터별 JSON 인덱스 샤드 (`indexes/{slug}/photos-index.json`)
- perceptual hash로 유사도 검색
- 썸네일만 프로젝트 캐시 — 원본은 USB

## 운영 목표

| 기간 | 목표 |
|------|------|
| 1개월 | 10,000장 (캐릭터당 2,000+) |
| 6개월 | 30,000장 |
| 1년 | 100,000장+ |

```bash
npm run universe:watch   # 상시 감시 + MJ 다운로드 즉시 반영
```

## 보안

- Midjourney/Google 로그인 정보는 **`.env.local`에만** 보관
- **절대 Git에 커밋하지 마세요**
- Photo Universe는 MJ API를 호출하지 않습니다 (수동 생성 + 자동 ingest)

## Image Factory 역할 변경

Image Factory / Prompt Catalog는 **Midjourney용 프롬프트 생성기**입니다.

- `npm run universe:prompt` — 운영 CLI
- `GET /api/photos/prompts/:slug/:category/random` — Prompt Catalog
- 생성 API 호출 ❌ → MJ 수동 생성 ✅

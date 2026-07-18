# PickMeTalk Hybrid Photo Factory v2.0

Midjourney는 **캐릭터 Master Dataset(10–20장)** 만 만들고,  
**RTX 5060 로컬 AI**가 Prompt Catalog 기반 대량 사진을 생산합니다.

```
Midjourney
  → Master Character Dataset (immutable)
  → Character Training / Face Identity Profile
  → RTX 5060 Local AI (FLUX / SDXL / ComfyUI)
  → Face Verification (≥95% ACTIVE / 90–95% REVIEW / <90% REJECT)
  → Quality Check + Metadata
  → Photo Library (D:\PickMeTalk_PhotoLibrary)
  → UI Mockups + Style Guide
  → PickMeTalk (read-only delivery)
```

## 역할 분리

| 도구 | 역할 |
|------|------|
| Midjourney | Master 얼굴 기준 이미지 10–20장/캐릭터 |
| RTX 5060 + Factory | 150 → 500 → 2k → 5k → 10k 대량 생산 |
| PickMeTalk 제품 | Photo Library 조회만 (생성 없음) |

## Yuna-first 운영 (Windows)

작업 디렉터리: `C:\Users\user\ai_girlfriend_app` (또는 `pickmetalk-ops`)

```bash
# 0) 폴더 부트스트랩
npm run factory:init

# 1) Midjourney Master 16장 Discord 매니페스트
npm run factory:master-manifest -- --character=yuna
# → data/.../master-manifests/yuna/discord/YUNA_MASTER_001.md …

# 2) MJ 다운로드 이미지를 다음으로 복사
#    D:\PickMeTalk_PhotoLibrary\master\yuna\_inbox\

# 3) Master 등록 + Face Identity Profile
npm run factory:profile -- --character=yuna

# 4) 로컬 대량 생성 (ComfyUI 권장)
#    ComfyUI http://127.0.0.1:8188 실행 후:
set FACTORY_ENGINE=comfyui
set FACTORY_COMFY_WORKFLOW=C:\path\to\flux_or_sdxl_api.json
npm run factory:generate -- --character=yuna --count=150

# Cloud/CI 스모크 (GPU 없음):
set FACTORY_ENGINE=stub
npm run factory:generate -- --character=yuna --count=2

# 5) UI Mockup + Style Guide + Best Profile
npm run factory:ui -- --character=yuna

# 원스톱 체크포인트
npm run factory:yuna -- --count=5
npm run factory:yuna -- --skip-generate
```

유나 얼굴 일관성·품질이 만족되면 `narin` → `yunseo` → `eunha` → `jiyu` 순으로 동일 파이프라인 확장.

## Master Dataset 샷 (16)

필수 커버리지: Front / L45 / R45 / L·R Profile × Neutral·Smile·Laugh × Indoor·Outdoor × Hair Down·Up × Casual·Daily·Selfie

경로: `{PHOTO_LIBRARY_ROOT}/master/{character}/`  
등록 후 **절대 수정하지 않음**.

## Generation Engine (모듈형)

```
GenerationEngine
  stub      — CI / 로컬 스모크용 placeholder PNG
  comfyui   — Windows RTX (FLUX/SDXL 워크플로 JSON)
  flux/sdxl — ComfyUI 별칭 (동일 호스트, 워크플로로 구분)
```

엔진 교체 시 Photo Library / Face Verification / Metadata / Dashboard 코드는 변경하지 않습니다.

환경변수:

- `FACTORY_ENGINE` — `stub` | `comfyui` | `flux` | `sdxl`
- `COMFYUI_URL` — default `http://127.0.0.1:8188`
- `FACTORY_COMFY_WORKFLOW` — ComfyUI API workflow JSON
- `FACTORY_FACE_AUTO_APPROVE` — default `0.95`
- `FACTORY_FACE_REVIEW_MIN` / `FACTORY_FACE_REJECT_BELOW` — default `0.9`
- `FACTORY_PHASE` — 현재 목표 장수 (150…)

## Face Verification

Master Face Identity(평균 + per-master embedding) 대비:

| Similarity | Status |
|------------|--------|
| ≥ 95% | ACTIVE |
| 90–95% | REVIEW (자동 수정 없음) |
| < 90% | REJECT |

## UI Mockup / Style Guide

새 ACTIVE 이미지 등록 후 `factory:ui`가:

- 프로필 후보 Top 5
- Best Profile + A/B
- 썸네일 캐시 48–512px
- Splash / Chat / Album / Timeline 등 HTML mock
- `STYLE_GUIDE.md` (팔레트, 표정 비율, 금지 사진)

출력: `{PHOTO_UNIVERSE_DATA_ROOT}/ui-mockups/{character}/`  
스타일 가이드: `{PHOTO_UNIVERSE_DATA_ROOT}/style-guides/{character}/STYLE_GUIDE.md`

## 제품 연동

제품은 이미지를 생성하지 않습니다. 검증된 ACTIVE만:

```bash
npm run photos:publish-product -- --file=... --character=yuna
```

## 확장

동일 Pipeline으로 RTX 6060 / Multi-GPU / Cloud GPU만 엔진 어댑터를 추가하면 됩니다.

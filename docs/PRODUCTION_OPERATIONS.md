# PickMeTalk Photo Production — 운영 가이드 (Windows)

테스트가 아닌 **실제 운영**용 Photo Library 구축 절차입니다.

> **Hybrid Photo Factory v2 (권장)**  
> Midjourney = Master Dataset 10–20장만 / **RTX 5060 로컬 AI = 대량 생산**  
> 상세: [`HYBRID_PHOTO_FACTORY.md`](./HYBRID_PHOTO_FACTORY.md)  
> 빠른 시작: `npm run factory:yuna`

## 목표

- Windows PC에서 **캐릭터당 2,000~10,000장** Photo Library 구축
- Midjourney는 Master 얼굴만, 대량은 `FACTORY_ENGINE=comfyui` (RTX)
- Phase: **150 → 500 → 2,000 → 5,000 → 10,000** (통계 게이트 통과 후 확장)
- (레거시) Discord watch-folder 대량 MJ 파이프라인은 아래에 유지

## 사전 조건

| 항목 | 값 |
|------|-----|
| OS | **Windows only** (Cloud/Linux에서 production 실행 불가) |
| Repo | `pickmetalk-ops` |
| Library root | `D:\PickMeTalk_PhotoLibrary` |
| Watch folder | `%USERPROFILE%\Downloads\PickMeTalk_MJ` |
| Node | 20+ |

`.env` (또는 `.env.local`) 예시:

```env
PICKMETALK_RUNTIME=production
PHOTO_LIBRARY_ROOT=D:/PickMeTalk_PhotoLibrary
PHOTO_UNIVERSE_ENABLED=true
MJ_PRODUCTION_MODE=production
MJ_PRODUCTION_PHASE=150
MJ_PHOTOS_PER_CHARACTER=150
MJ_IMPORT_WATCH_FOLDER=C:/Users/user/Downloads/PickMeTalk_MJ
```

## Phase 1 시작 (Yuna 150 권장)

```powershell
cd C:\Users\user\pickmetalk-ops

git pull origin main
npm install

# 원클릭 Phase 1 (Yuna × 150 + Manifest + Watch)
npm run mj:phase1

# 5명 전부 750장
# npm run mj:phase1 -- --all

# Queue+Manifest만 (Watch는 나중에)
# npm run mj:phase1 -- --no-watch
```

수동 단계:

```powershell
npm run mj:init
npm run mj:ready -- --bootstrap
npm run mj:characters-manifest -- --count=150 --character=yuna --new
# Discord: data\photo-universe\characters-manifest\yuna\discord\YUNA_001.md …
npm run mj:production
```

Manifest 파일: `YUNA_001.md` … `YUNA_150.md` — 내용이 `/imagine …` 한 줄만 (Discord 붙여넣기용).


자동 생성:

- `D:\PickMeTalk_PhotoLibrary\{yuna|narin|yunseo|eunha|jiyu}\{category}\`
- `_review`, `_rejected` (캐릭터별)
- `D:\PickMeTalk_PhotoLibrary\_inbox`
- `%USERPROFILE%\Downloads\PickMeTalk_MJ`

카테고리 폴더: `morning`, `home`, `cafe`, `work`, `travel`, `rainy`, `selfie`, `mirror`, `workout`, `date`, `shopping`, `cooking`, `school`, `office`, `beach`, `park`, `spring`, `summer`, `autumn`, `winter`, `christmas`, `birthday`, `vacation`, `festival`, `movie`, `restaurant`, `driving`, `airport`, `hotel`, `han-river`, `karaoke`, `gaming`, `reading`, `study`, `pet`, `sleeping`, `fashion`, `beauty`, `hospital`, `daily` 등

## 2. Face Reference (최초 1회)

각 캐릭터 기준 얼굴 이미지 1장 이상:

```
data/photo-universe/face-references/yuna/*.jpg
data/photo-universe/face-references/narin/*.jpg
...
```

## 3. Production Ready 확인

```powershell
npm run mj:ready -- --bootstrap
```

출력에 **`PRODUCTION READY`** 가 보이면 Phase 150 시작 가능.

## 4. Queue 생성 (캐릭터당 150장)

```powershell
npm run mj:queue -- --count=150 --new
```

순서: Yuna → Narin → Yunseo → Eunha → Jiyu

콘솔에 **Midjourney 프롬프트**와 **저장 폴더**가 출력됩니다.

## 5. Production 시작 (Watch + Dashboard)

```powershell
npm run mj:production
```

- `Downloads\PickMeTalk_MJ` **상시 감시**
- Discord MJ에서 생성 → 다운로드 저장 → 자동 ingest

통계만:

```powershell
npm run mj:production -- --stats
```

## 6. 자동 Ingest 파이프라인

저장 시 순서:

1. Face Verification (≥95% ACTIVE, 80–95% REVIEW, <80% REJECT)
2. Quality Check
3. `{filename}.meta.json` 생성
4. Thumbnail 생성
5. SQLite Catalog 등록
6. Search Index (JSON) 갱신
7. `D:\PickMeTalk_PhotoLibrary\{char}\{category}\` 이동

**자동 수정 없음** — REJECT는 `_rejected/`로 복사.

### `.meta.json` 필드

`photoId`, `character`, `category`, `location`, `prompt`, `negativePrompt`, `weather`, `season`, `outfit`, `camera`, `emotion`, `createdAt`, `faceSimilarity`, `qualityScore`, `faceVerified`, `duplicate`, `source`, `model`, `usedCount`

## 7. Dashboard 예시

`npm run mj:production` 실행 중 60초마다 콘솔 갱신:

```
Yuna     ██████████  145 / 150
         ACTIVE 138  REVIEW 5  REJECT 2
         Average Face 97.8%  Average Quality 94.6
```

웹: Express 실행 후 http://localhost:3000/production.html

## 8. Phase 확장

150장 완료 후:

```powershell
npm run mj:production -- --stats
```

Gate PASS 시 `.env`에서:

```env
MJ_PRODUCTION_PHASE=500
```

다시 `npm run mj:queue -- --count=500 --new` → `npm run mj:production`

Scale tiers: `20 → 100 → 200 → 500 → 1000 → 2000 → 5000`

## 9. Product 연동 (QC 통과 후)

Product Supabase로 publish:

```powershell
npm run photos:publish-product -- --file "D:\PickMeTalk_PhotoLibrary\yuna\cafe\xxx.jpg" --character yuna --category cafe --emotion happy
```

- Ops 폴더 slug: `yunseo` → Product id: `yoonseo` (publish 시 자동 normalize)

## 10. 완료 기준 체크리스트

- [ ] `D:\PickMeTalk_PhotoLibrary` 생성
- [ ] 5캐릭터 × 카테고리 폴더 생성
- [ ] `Downloads\PickMeTalk_MJ` 감시 시작 (`mj:production`)
- [ ] 테스트 이미지 1장 ingest → `.meta.json` + thumbnail 확인
- [ ] SQLite catalog (`data/photo-universe/catalog.db`) row 확인
- [ ] Face Verification 동작 (ACTIVE/REVIEW/REJECT)
- [ ] Dashboard ACTIVE/REVIEW/REJECT + Average Face/Quality 표시
- [ ] `npm run mj:ready` → **PRODUCTION READY**

## Cursor / Copilot 운영 프롬프트

Windows PC에서 아래 순서만 반복:

1. `npm run mj:init` (최초 1회)
2. `npm run mj:queue -- --count=150 --new`
3. `npm run mj:production`
4. Discord MJ 생성 → `Downloads\PickMeTalk_MJ` 저장
5. 콘솔 Dashboard / `--stats`로 진행 확인

**하지 말 것:** Cloud Agent/Linux에서 production 실행, 두 repo git merge, Express를 product에 이식.

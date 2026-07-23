# [픽미톡] 2026-07-23 캐릭터 후보 사진 +20장 지시서

**목표:** 캐릭터 **아직 확정 전** — 5명 각각 **후보 20장** 더 생성하고, Desktop `픽미톡 ai` 폴더에 **정면 위주**만 모아 사용자가 고를 수 있게 정리.

**캐릭터:** 유나 · 나린 · 윤서 · 은하 · 지유 (`yuna` `narin` `yunseo` `eunha` `jiyu`)

## 금지

- `character-meet.config.ts`의 `heroPhoto` **확정 변경** (사용자 고르기 전)
- 다른 캐릭터 사진 **해시 공유·복붙**
- `.env`·API 키 출력·커밋

## Cloud / Ops에서 한 일

1. **정면 고정 프롬프트 100개** 생성 스크립트: `npm run photos:front-candidates`
2. 출력: `data/front-candidates-2026-07-23/{slug}/`
   - `front-20.json` · `prompts/*.md` · `PASTE_SHEET.txt`
3. Desktop 정리 스크립트: `scripts/organize-desktop-front.ps1`

## Windows 실행 순서

```powershell
cd C:\Users\user\pickmetalk-ops
git fetch origin
git checkout cursor/front-candidates-20-00f8
git pull
npm install

# 1) 정면 후보 프롬프트 생성 (5×20)
npm run photos:front-candidates

# 2) MJ / 로컬 AI로 data\front-candidates-2026-07-23\{slug}\prompts\ 생성
#    또는: npm run photos:prompt -- yuna 20   (정면 강제 없음 — front-candidates 권장)

# 3) Desktop 폴더 생성
.\scripts\organize-desktop-front.ps1

# 4) 생성 이미지를 소스에 모은 뒤 front\로 복사·리네임
.\scripts\organize-desktop-front.ps1 -SourceRoot "C:\Users\user\Downloads\PickMeTalk_MJ"

# 5) (선택) repo 백업
# Copy-Item "...\픽미톡 ai\yuna\front\*" assets\photos\yuna\front\ -Force
```

## 완료 기준 체크

- [ ] 5캐릭터 × Desktop `front\`에 **20장씩**
- [ ] 각 `front\` README.txt (생성일 + 총 장수)
- [ ] (선택) `assets/photos/{slug}/` 백업
- [ ] heroPhoto **미변경**

## 작업 끝 로그

```bat
python C:\Users\user\OneDrive\Desktop\sun\scripts\log_activity.py pickmetalk "7/23: 5캐릭터 front 후보 +20장 Desktop 정리"
```

## 참고

- `docs/CHARACTER_IMAGE_FACTORY.md`
- `src/data/character-specs.ts` identity lock
- `docs/local-ai-master-prompts/` (Master Dataset과 별개 — 이번은 **프로필 후보 front**)

# PickMeTalk Prompt Catalog

사진 **생성용 프롬프트 라이브러리** (이미지 파일 아님).

## 구조

```
assets/prompts/
  yuna/
    _index.json      # 카테고리 목록 + 총 개수
    cafe.json        # 카테고리별 30개 프롬프트
    morning.json
    ...
  narin/
  yunseo/
  eunha/
  jiyu/
```

## 규모

| 항목 | 값 |
|------|-----|
| 캐릭터 | 5명 |
| 카테고리 | 112개 |
| 카테고리당 | 30개 |
| 캐릭터당 | **3,360개** |
| 전체 | **16,800개** |

## 재생성

```bash
npm run prompts:build           # 전체
npm run prompts:build -- yuna   # 캐릭터 1명
npm run prompts:build -- yuna cafe  # 카테고리 1개
npm run prompts:verify          # 중복·개수 검증
```

카테고리 정의 수정: `src/config/prompt-categories.config.ts`

상세 문서: [docs/CHARACTER_IMAGE_FACTORY.md](../docs/CHARACTER_IMAGE_FACTORY.md)

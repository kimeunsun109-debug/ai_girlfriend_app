# PickMeTalk Character Image Factory (MASTER PROMPT)

> 당신은 PickMeTalk의 전담 AI 포토그래퍼이자 영화 촬영감독이다.  
> 목표는 **"AI 이미지"가 아니라 실제 사람이 스마트폰으로 촬영한 것 같은 자연스러운 사진**이다.

---

## 캐릭터 DNA

| slug | 이름 | DNA |
|------|------|-----|
| `yuna` | 유나 | 편안한 생활여친 |
| `narin` | 나린 | 츤데레 여친 |
| `yunseo` | 윤서 | 결정장애 해결사 |
| `eunha` | 은하 | 색다른 시각 |
| `jiyu` | 지유 | 텐션 넘치는 트렌디 여친 |

---

## 가장 중요한 규칙

**항상 동일한 캐릭터이다.** 얼굴이 매번 바뀌면 실패이다.

절대 변경하지 않는 항목 (Identity Lock):

- 얼굴형, 눈매, 코, 입, 피부톤, 나이, 분위기, 체형
- 헤어스타일 (상황에 따른 묶음은 허용)

같은 사람이 다른 장소에서 찍은 사진처럼 보여야 한다.

코드: `src/data/character-specs.ts` → `identity` 필드

---

## 사진 품질 (Positive)

Ultra realistic · Photorealistic · Natural Smartphone Photo · Casual Daily Life  
No AI Look · No CGI · No Plastic Skin · Natural skin texture · Real pores  
Shot on iPhone 16 Pro · 50mm lens look · Very realistic Korean woman

## Negative (금지)

AI beauty · model photoshoot · studio lighting · plastic skin · doll face  
same pose/outfit/background repeated · professional photography

---

## 랜덤 생성 항목

매번 아래 항목을 랜덤 조합한다 (`src/config/character-image-factory.config.ts`):

| 항목 | 예시 |
|------|------|
| 시간 | 새벽, 아침, 노을, 비 오는 밤 |
| 장소 | 집, 카페, 지하철, 한강, 미용실 |
| 날씨 | 맑음, 비, 눈, 벚꽃, 단풍 |
| 의상 | 후드티, 니트, 잠옷, 운동복 |
| 감정 | 행복, 설렘, 졸림, 삐짐 |
| 행동 | 커피 마시기, 셀카, 게임, 요리 |
| 표정 | 자연스러운 미소, 졸린 표정, 눈웃음 |
| 카메라 | 아이폰 셀카, 거울 셀카, 친구가 찍어줌 |

---

## 사용법

### CLI — 프롬프트 배치 생성

```bash
# 유나 1개
npm run photos:prompt -- yuna

# 유나 5개 (서로 다른 시나리오)
npm run photos:prompt -- yuna 5

# 전 캐릭터 각 3개
npm run photos:prompt -- --all 3

# 사진 카탈로그 category에 맞춘 시나리오
npm run photos:prompt -- yuna --category hair --emotion shy

# JSON 출력 (외부 이미지 생성 도구에 연동)
npm run photos:prompt -- yuna 10 --json --out prompts/yuna-batch.json
```

### API

```bash
# 프롬프트 1개
GET /api/photos/prompt?character=yuna

# 5개 + 시드 고정 (재현 가능)
GET /api/photos/prompt?character=narin&count=5&seed=42

# category 연동
GET /api/photos/prompt?character=yuna&category=coffee&emotion=happy

# 캐릭터 DNA / identity lock 메타
GET /api/photos/factory/yuna
```

### 응답 예시

```json
{
  "count": 1,
  "prompts": [{
    "character": "유나",
    "slug": "yuna",
    "characterDNA": "편안한 생활여친",
    "scenario": {
      "time": "afternoon",
      "location": "cafe",
      "weather": "clear sky",
      "outfit": "knit sweater",
      "emotion": "happy",
      "action": "drinking coffee",
      "expression": "natural subtle smile",
      "camera": "photo on table pointing up"
    },
    "prompt": "PickMeTalk Character Image Factory — MASTER PROMPT\n...",
    "negativePrompt": "AI beauty, model photoshoot, ...",
    "seed": 12345
  }]
}
```

---

## 생성 원칙

- 같은 캐릭터의 SNS를 **2년 동안 모은 느낌**
- 사진마다 분위기는 다르지만 **"같은 사람"**이 바로 느껴져야 함
- AI 이미지처럼 보이는 요소는 모두 제거
- 가끔 손떨림·초점 어긋남·불완전한 빛도 허용 (너무 완벽하면 AI 같음)

---

## 코드 구조

```
src/
├── config/character-image-factory.config.ts  # MASTER PROMPT 상수·랜덤 풀
├── data/character-specs.ts                     # 캐릭터 identity lock + imagePromptBase
├── lib/photo-catalog/image-factory.ts          # 프롬프트 조합 엔진
scripts/image-prompt-generate.ts                # CLI
```

---

## 사진 카탈로그와 연동

1. `npm run photos:prompt -- yuna --category hair` 로 프롬프트 생성
2. 외부 이미지 생성 도구(Midjourney, DALL·E, Flux 등)에 `prompt` + `negativePrompt` 입력
3. 생성된 이미지를 `assets/photos/yuna/hair/` 에 저장
4. `npm run photos:migrate` 로 인덱스·DB 동기화

상세 파이프라인: [PHOTO_PUSH.md](./PHOTO_PUSH.md)

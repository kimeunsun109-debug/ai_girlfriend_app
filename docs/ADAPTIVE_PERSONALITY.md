# Adaptive Personality — 같은 캐릭터, 함께 성장

> Core Personality는 고정, 표현 방식은 적응

## 목표

- "모든 유나가 똑같다"를 피하고
- "내 유나는 나와 함께 성장했다"를 제공

## 핵심 원칙

- **Core Personality 유지**: 캐릭터의 본질적 기질은 변하지 않음
- **Adaptive Layer 변화**: 말투, 감정 표현, 먼저 연락 확률, 습관/선호
- **느린 변화**: 하루 ±1, 특별 이벤트 ±3

## 데이터 모델

- `PersonalityDNA` (20 traits, coreValue + adaptiveValue)
- `PersonalityHistory` (변화 로그)
- `HabitLearning` (접속/대화 습관)
- `UserPreference` (좋아요/싫어요 학습)
- `GrowthEvent` (성장 타임라인)
- `AdaptiveMemory` ("왜 변했는지" 기억)

## 모듈

```
src/lib/adaptive-personality/
  adaptive-personality-engine.ts
  personality-dna.ts
  dna-evolution-engine.ts
  habit-learning-engine.ts
  preference-learning-engine.ts
  adaptive-dialogue-engine.ts
  adaptive-photo-engine.ts
  adaptive-emotion-engine.ts
  adaptive-push-engine.ts
  growth-timeline.ts
```

## API

- `GET /api/personality?userCharacterId=`
- `GET /api/personality/dna?userCharacterId=`
- `GET /api/personality/history?userCharacterId=`
- `POST /api/personality/update`
- `GET /api/preferences?userCharacterId=`

## UI

- `http://localhost:3000/personality.html`
- "성장한 유나" 화면: DNA 바 차트, 습관 학습, 선호, 최근 성장

## 자동 학습 트리거

- 푸시 클릭/열람/좋아요 → preference 강화
- 답장(칭찬/장난/위로/늦은 답장) → DNA 진화
- 활동 기록(/activity) → 습관 학습 (22시 접속 등)
- 메시지 생성 시 AdaptiveDialogue 반영

## Personality Reflection 예시

- "예전엔 먼저 연락 못 했는데 요즘은 나도 먼저 연락하게 되네."
- "네가 맨날 칭찬해줘서 자신감이 생겼어."


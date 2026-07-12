# Natural Conversation Engine

> 목표: **"AI와 대화"가 아니라 "사람과 대화"**

## 최우선 원칙

- 절대 AI처럼 말하지 않음
- 설명·분석·상담·강의 금지
- **반응**이 먼저, 정답은 나중
- 카톡처럼 짧게 (1~3문장)

## 적용 위치

모든 캐릭터 **아웃바운드** 메시지는 `polishCharacterMessage()`를 거칩니다:

| 모듈 | 적용 |
|------|------|
| `message-variation.ts` | 푸시 메시지 finalize |
| `photo-selector.service.ts` | 사진 푸시 문구 |
| `followup.service.ts` | 후속 반응 + 답장 |
| `dynamic-conversation.service.ts` | 관계 단계별 말투 |
| `adaptive-dialogue-engine.ts` | DNA 기반 말투 |
| `relationship-event-engine.ts` | 호감도별 스타일 |
| `memory-reminder-engine.ts` | 기억 리마인더 |

## 금지 표현

`src/config/natural-conversation.config.ts` → `BANNED_AI_PHRASES`

- "이해합니다", "공감합니다", "도움이 되었으면", "알겠습니다" 등

## 사용자 반응 API

```bash
POST /api/conversation/react
{
  "userCharacterId": "00000000-0000-0000-0000-000000000020",
  "content": "나 방금 치킨 시켰다"
}
```

응답 예: `{ "reaction": "헐 나도 먹고 싶다ㅋㅋ", "intent": "food" }`

## 코드

```
src/config/natural-conversation.config.ts
src/lib/natural-conversation/natural-conversation-engine.ts
```

## 테스트

```bash
npm test -- natural-conversation
```

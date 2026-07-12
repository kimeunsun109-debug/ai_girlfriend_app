# Relationship Journey — AI와 함께 시간을 보내는 경험

> "AI와 대화했다"가 아니라 "AI와 함께 시간을 보냈다"

## 핵심 시스템

| 시스템 | 설명 |
|--------|------|
| Relationship Journey | 8단계 관계 성장 (처음 만남 → 평생 함께) |
| Memory Timeline | 모든 중요 순간 기록 |
| Memory Album | 사진 자동 앨범 분류 |
| Anniversary Engine | 1일~1000일 기념일 자동 계산 |
| Shared Memory | 감정 기억 + 자연스러운 회상 |
| Memory Replay | 1년 전 오늘 같은 날 추억 |

## 8단계 관계

| Lv | 이름 | 보상 |
|----|------|------|
| 1 | 처음 만남 | — |
| 2 | 어색한 사이 | 셀카 |
| 3 | 친해진 사이 | 음성메시지 |
| 4 | 매일 연락 | 전화 |
| 5 | 썸 | 질투 |
| 6 | 연인 | 애칭 |
| 7 | 오래된 연인 | 커플사진 |
| 8 | 평생 함께 | 특별 이벤트 |

## API

```
GET  /api/timeline?userCharacterId=
POST /api/timeline
GET  /api/anniversary?userCharacterId=
GET  /api/memory?userCharacterId=
POST /api/memory
GET  /api/album?userCharacterId=
GET  /api/journey?userCharacterId=
GET  /api/replay?userCharacterId=
```

## UI

`http://localhost:3000/memories.html` — Timeline, Album, Anniversary, Journey 탭

## 자동 기록 트리거

- 캐릭터 연결 → 첫 만남 + 기념일 시드
- 사진 푸시 → 타임라인 + 앨범 + 첫 사진/셀카
- 긍정 답장 → 특별 대화 기억
- 부정 답장 → 첫 다툼
- 호감도 상승 → 단계 업 + 보상 해금
- 기념일 도달 → 축하 메시지 + 타임라인

## Memory Replay

푸시 메시지 생성 시 12% 확률로 과거 추억 삽입:

- "오늘 보니까 딱 1년 전에도 비가 왔더라."
- "그날 네가 나 예쁘다고 해줘서 아직도 기억나."

## 모듈

```
src/lib/relationship-journey/
  relationship-journey.service.ts
  memory-timeline.service.ts
  memory-event-engine.ts
  anniversary-engine.ts
  shared-memory.service.ts
  memory-album.service.ts
  memory-replay.service.ts
  dynamic-conversation.service.ts
  relationship-reward.service.ts
```

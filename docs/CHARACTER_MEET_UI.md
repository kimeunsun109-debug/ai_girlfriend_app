# Character Meet UI

> 목표: **"AI를 선택하는 화면"이 아니라 "누군가와 만나러 들어온 느낌"**

## 구성

| 레이어 | 경로 |
|--------|------|
| API | `GET /api/meet/home` |
| Config | `src/config/character-meet.config.ts` |
| Service | `src/services/meet.service.ts` |
| Web (Next.js) | `web/` |

## 실행

터미널 1 — API (포트 3000):

```bash
npm run dev
```

터미널 2 — Meet UI (포트 3001):

```bash
npm run web:dev
```

브라우저: http://localhost:3001

## UX 원칙

- 리스트 ❌ → 풀스크린 Hero 카드 + 가로 스크롤 카드
- 호감도 숫자 ❌ → `❤️ 보고 싶어함`, `🥺 기다리는 중` 등 감성 상태
- 선택 버튼 ❌ → 카드 탭 시 채팅으로 자연스럽게 전환
- Today's Pick — 날짜·사용자 기준 추천 캐릭터
- Living Photo — 숨쉬듯 확대/축소, 빛 반사 shimmer
- Spring 애니메이션 (Framer Motion)

## API 예시

```bash
curl "http://localhost:3000/api/meet/home?userId=00000000-0000-0000-0000-000000000010"
```

## 레거시 갤러리

기존 사진 미리보기: http://localhost:3000/gallery.html

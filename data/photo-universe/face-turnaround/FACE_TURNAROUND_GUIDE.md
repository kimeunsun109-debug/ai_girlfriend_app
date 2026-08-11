# 4명 얼굴 턴어라운드 — Midjourney 전체 가이드

## 캐릭터
| 캐릭터 | 프롬프트 수 | 로컬 레퍼런스 | CREF |
|--------|------------|--------------|------|
| 나린 (narin) | 9 | `C:\Users\user\OneDrive\Desktop\픽미톡 ai\확정\나린` | 설정 필요 |
| 유나 (yuna) | 9 | `C:\Users\user\OneDrive\Desktop\픽미톡 ai\확정\유나` | 설정 필요 |
| 지유 (jiyu) | 9 | `C:\Users\user\OneDrive\Desktop\픽미톡 ai\확정\지유\지유 2.png` | 설정 필요 |
| 윤서 (yunseo) | 9 | `C:\Users\user\OneDrive\Desktop\픽미톡 ai\확정\윤서\윤서4.png` | 설정 필요 |

## Windows 자동 생성

```powershell
# Terminal A — Watch
npm run mj:production

# Terminal B — 얼굴 턴어라운드 자동 제출 (캐릭터별)
npm run mj:auto -- --character=narin --limit=9
npm run mj:auto -- --character=yuna --limit=9
npm run mj:auto -- --character=jiyu --limit=9
npm run mj:auto -- --character=yunseo --limit=9
```

## 수동 Discord 붙여넣기

각 캐릭터 `discord/*.md` 파일 내용을 Discord Midjourney 채널에 붙여넣기.

## 각도별 구성 (캐릭터당 9장)
- 정면 × 3변형
- 오른쪽 × 3변형
- 왼쪽 × 3변형

생성 시각: 2026-08-11T05:02:10.907Z

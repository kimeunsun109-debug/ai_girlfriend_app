# PickMeTalk — 자연스러운 사진 푸시 시스템

> "와… 진짜 사람이 나를 기다려주는 것 같다."

AI 연인이 실제 사람처럼 자연스러운 사진과 메시지를 보내는 푸시 알림 시스템입니다.

## 핵심 설계 원칙

- **감정 설계 우선**: 기능이 아닌 감정을 설계합니다
- **광고 푸시 금지**: 타이틀 없이 메시지만, 사진이 도착한 느낌
- **랜덤성**: 매일 다른 시간, 다른 패턴
- **개인화**: 사용자 이름 자연스럽게 사용
- **중복 방지**: 같은 사진/멘트/시간/패턴 반복 금지

## 주요 기능

### 1. 사진 푸시 시스템
- 푸시 클릭 → AI 사진 + 메시지 채팅 화면으로 이동
- 하루 0~2회 (절대 2회 초과 금지)
- 생일/기념일/100일 추가 1회 가능

### 2. 발송 규칙
| 규칙 | 설명 |
|------|------|
| 기본 빈도 | 하루 0~2회, 평균 1~2회 |
| 랜덤 시간 | 08:20, 11:58, 18:22 등 매일 다름 |
| Skip Day | 월 1~2회 일부러 미발송 |
| 특별한 날 | 생일/기념일/100일 +1회 |

### 3. 사용자 반응 기반 학습
- 푸시 클릭, 사진 열람, 답장, 답장 속도, 대화 길이, 좋아요, 이모티콘 분석
- 반응 좋은 사용자: 빈도 소폭 증가, 사진 다양성 증가
- 무반응 사용자: 빈도 감소, 며칠 쉬었다 재접근

### 4. 후속 반응 시나리오
```
사진: "오늘 머리했는데 어때? 😊"
  ↓ 30분 답장 없음
"바쁜가 봐 😊 나중에 봐도 돼!"
  ↓ 2시간 답장 없음
"별론가… 😥"
  ↓ 답장: "예뻐"
"😀❤️"
```

### 5. 데이터 분석
- CTR, 답장률, 7일/30일 유지율
- 사진 종류별 클릭률/답장률
- Skip Day 이후 재접속률
- 사용자별 최적 발송 시간/요일

## 기술 스택

- **Runtime**: Node.js + TypeScript
- **API**: Express
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: BullMQ + Redis
- **Push**: Firebase Cloud Messaging (FCM)
- **Scheduler**: Custom worker (5분 주기)

## 프로젝트 구조

```
src/
├── config/          # 푸시 설정 상수
├── data/            # 상황별 메시지 템플릿
├── services/
│   ├── scheduler.service.ts      # 푸시 스케줄러
│   ├── engagement.service.ts     # 참여도 기반 빈도 조절
│   ├── photo-selector.service.ts # 사진/메시지 선택
│   ├── followup.service.ts       # 후속 반응 시나리오
│   ├── analytics.service.ts      # 데이터 분석
│   └── push-notification.service.ts
├── lib/photo-catalog/  # 사진 import·인덱스·검색
├── routes/             # REST API (users, push, photos)
├── workers/         # 백그라운드 스케줄러
└── utils/           # 유틸리티
prisma/
└── schema.prisma    # DB 스키마
```

## 시작하기

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# DB 마이그레이션 (로컬 Postgres 또는 Supabase DATABASE_URL)
npm run db:push

# 시드 데이터
npm run db:seed

# API 서버 실행
npm run dev

# 스케줄러 워커 실행 (별도 터미널)
npm run worker
```

### Supabase만 사용하는 경우

로컬 Postgres 없이 Supabase SQL Editor로 스키마·시드를 적용할 수 있습니다.

1. `supabase/schema.sql` 실행 (빈 DB, 1회)
2. `supabase/seed.sql` 실행
3. `.env`에 Supabase `DATABASE_URL` 설정
4. `npm run db:generate` 후 `npm run dev`

상세: **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)**

## API 엔드포인트

### 사용자
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/users` | 사용자 생성 (이름, 나이) |
| GET | `/api/users/:userId` | 사용자 조회 |
| POST | `/api/users/:userId/characters` | 캐릭터 연결 |
| POST | `/api/users/:userId/special-days` | 특별한 날 등록 |

### 푸시
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/push/device-token` | 디바이스 토큰 등록 |
| POST | `/api/push/click/:pushLogId` | 푸시 클릭 기록 |
| POST | `/api/push/view/:pushLogId` | 사진 열람 기록 |
| POST | `/api/push/reply/:pushLogId` | 답장 + 후속 시나리오 |
| POST | `/api/push/like/:pushLogId` | 좋아요 |
| GET | `/api/push/analytics/:userId` | 사용자 분석 |
| GET | `/api/push/dashboard` | 전체 대시보드 |

## 환경 변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `REDIS_URL` | Redis 연결 문자열 |
| `FIREBASE_PROJECT_ID` | FCM 프로젝트 ID |
| `FIREBASE_CLIENT_EMAIL` | FCM 서비스 계정 이메일 |
| `FIREBASE_PRIVATE_KEY` | FCM 서비스 계정 키 |

## 캐릭터 사진 시스템

캐릭터당 1,000장 이상의 사진을 **slug/category** 구조로 관리합니다.
상세 내용은 **[docs/PHOTO_PUSH.md](docs/PHOTO_PUSH.md)** 를 참고하세요.

### 폴더 구조

```
assets/photos/
  yuna/
    photos-index.json
    hair/
    coffee/
    rain/
  narin/
  ...
```

### Import (픽미톡 ai 폴더)

```bash
# Windows 로컬
LOCAL_PHOTOS_DIR="C:/Users/user/OneDrive/Desktop/픽미톡 ai" npm run photos:import

# 경로 인자
npm run photos:import -- "./픽미톡 ai"
```

- 지원: jpg, jpeg, png, webp
- 중복·손상·미지원 파일 자동 제외
- 폴더/파일명 키워드로 상황 자동 분류

### 기존 에셋 마이그레이션

```bash
npm run photos:migrate
```

### 사진 검색 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/photos/search?character=yuna&category=hair&emotion=shy` | 상황별 사진 |
| GET | `/api/photos/stats/yuna` | 캐릭터 통계 |

Photo Push는 **캐릭터 + 상황 + 감정** 기반으로 사진을 선택합니다 (전체 랜덤 ❌).

### AI 이미지 생성 (Character Image Factory)

실제 사람이 찍은 듯한 사진 프롬프트를 자동 생성합니다. 상세: **[docs/CHARACTER_IMAGE_FACTORY.md](docs/CHARACTER_IMAGE_FACTORY.md)**

```bash
npm run photos:prompt -- yuna 5
GET /api/photos/prompt?character=yuna&category=hair
```

### Prompt Catalog (16,800 prompts)

```bash
GET /api/photos/prompts/yuna/cafe/random
npm run prompts:build    # assets/prompts/ 재생성
```

상세: [docs/CHARACTER_IMAGE_FACTORY.md](docs/CHARACTER_IMAGE_FACTORY.md)

## Natural Conversation (사람처럼 대화)

목표는 **"AI와 대화"가 아니라 "사람과 대화"** 입니다. 상세: **[docs/NATURAL_CONVERSATION.md](docs/NATURAL_CONVERSATION.md)**

- AI 티 나는 표현 자동 제거 ("이해합니다", "공감합니다" 등)
- 감정 반응 우선, 1~3문장 카톡 스타일
- 푸시·후속·관계·DNA 말투 전부 `polishCharacterMessage()` 경유

```bash
POST /api/conversation/react
{ "userCharacterId": "...", "content": "나 방금 치킨 시켰다" }
```

## Living AI (살아있는 여자친구)

AI가 먼저 하루를 살아가며 연락합니다. 상세: **[docs/LIVING_AI.md](docs/LIVING_AI.md)**

## Relationship Journey (추억과 관계 성장)

AI와 **함께 시간을 보내는** 경험. 상세: **[docs/RELATIONSHIP_JOURNEY.md](docs/RELATIONSHIP_JOURNEY.md)**

- 8단계 관계 성장 (처음 만남 → 평생 함께)
- Memory Timeline + Album + Anniversary
- Memory Replay (1년 전 오늘 추억)
- 단계별 다른 말투·보상 해금

```bash
# UI: http://localhost:3000/memories.html
GET /api/timeline?userCharacterId=
GET /api/journey?userCharacterId=
GET /api/album?userCharacterId=
```

## Adaptive Personality (같은 캐릭터, 함께 성장)

Core Personality는 유지하고, DNA가 천천히 적응합니다. 상세: **[docs/ADAPTIVE_PERSONALITY.md](docs/ADAPTIVE_PERSONALITY.md)**

- 20개 Personality DNA (0~100)
- Habit/Preference Learning
- Growth Timeline + Adaptive Memory
- 사용자별 다른 말투/행동 진화

```bash
GET /api/personality?userCharacterId=
GET /api/personality/dna?userCharacterId=
GET /api/personality/history?userCharacterId=
POST /api/personality/update
GET /api/preferences?userCharacterId=
# UI: /personality.html
```

### Web Push

```bash
npm run vapid:generate   # .env에 키 설정
npm run dev              # http://localhost:3000 에서 테스트
```

## 라이선스

Private — PickMeTalk

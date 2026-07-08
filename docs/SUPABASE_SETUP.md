# Supabase 데이터베이스 설정

PickMeTalk은 PostgreSQL + Prisma를 사용합니다. 로컬 Postgres 없이 **Supabase**만으로도 스키마와 시드 데이터를 적용할 수 있습니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **Project Settings → Database**에서 연결 문자열을 복사합니다.
   - 권장: **Session pooler** (IPv4) URI
   - 형식: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`

## 2. SQL Editor에서 스키마 적용

1. Supabase Dashboard → **SQL Editor** → **New query**
2. 저장소의 [`supabase/schema.sql`](../supabase/schema.sql) 내용을 **전체** 붙여넣고 **Run**
3. 성공 후 [`supabase/seed.sql`](../supabase/seed.sql)을 붙여넣고 **Run**

> `schema.sql`은 **빈 데이터베이스**에 한 번만 실행하세요. 이미 테이블이 있으면 enum/테이블 중복 오류가 납니다.

## 3. 환경 변수 설정

```bash
cp .env.example .env
```

`.env`의 `DATABASE_URL`을 Supabase 연결 문자열로 바꿉니다:

```env
DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

## 4. Prisma 클라이언트 생성

SQL로 스키마를 적용했어도 앱 실행 전에는 Prisma Client 생성이 필요합니다:

```bash
npm install
npm run db:generate
```

## 5. (선택) Prisma로 스키마 동기화

Supabase 대신 로컬/원격 DB에 Prisma로 직접 푸시할 수도 있습니다:

```bash
npm run db:push    # prisma db push — 스키마 동기화
npm run db:seed    # prisma/seed.ts — 시드 (SQL seed와 동일 데이터)
```

| 스크립트 | 설명 |
|----------|------|
| `npm run db:generate` | `@prisma/client` 생성 |
| `npm run db:push` | `prisma db push` — DB에 스키마 반영 |
| `npm run db:migrate` | `prisma migrate dev` — 마이그레이션 개발 |
| `npm run db:seed` | 캐릭터·관계 단계·데모 유저 시드 |
| `npm run db:schema:sql` | `supabase/schema.sql` 재생성 |

## 6. 데모 데이터 ID

`seed.sql` / `db:seed` 실행 후 API 테스트용 ID:

| 항목 | UUID |
|------|------|
| Demo user | `00000000-0000-0000-0000-000000000010` |
| Demo userCharacter (유나) | `00000000-0000-0000-0000-000000000020` |

예시:

```bash
curl "http://localhost:3000/api/journey?userCharacterId=00000000-0000-0000-0000-000000000020"
curl "http://localhost:3000/api/personality/dna?userCharacterId=00000000-0000-0000-0000-000000000020"
```

## 7. 사진 카탈로그 (별도)

DB 시드 후 로컬 에셋을 DB에 등록하려면:

```bash
npm run photos:migrate
```

## 문제 해결

### `Missing script: "db:push"`

`package.json`에 Prisma 스크립트가 없는 브랜치를 사용 중일 수 있습니다. 최신 feature 브랜치를 pull하거나 `main`에 머지된 버전을 사용하세요.

### `Can't reach database server at localhost:5432`

`.env`의 `DATABASE_URL`이 로컬 Postgres를 가리키고 있습니다. Supabase URI로 변경하세요.

### `type "Platform" already exists`

`schema.sql`을 이미 실행한 DB입니다. 스키마는 건너뛰고 `seed.sql`만 실행하세요.

### 스키마 변경 후 SQL 재생성

`prisma/schema.prisma`를 수정했다면:

```bash
npm run db:schema:sql
```

생성된 `supabase/schema.sql`을 Supabase SQL Editor에서 다시 적용합니다 (기존 DB는 수동 diff 또는 `db push` 권장).

# PickMeTalk Ops

Node.js + TypeScript operations repo. See `README.md` for the full product overview and API list.

## Cursor Cloud specific instructions

### Services
- **API** (`npm run dev`, Express + Prisma) → http://localhost:3000. Health: `GET /health`. Static assets served from `assets/` and `public/`.
- **Web / Meet UI** (`npm run web:dev`, Next.js in `web/`) → http://localhost:3001. It proxies `/api`, `/assets`, `/library` to the API on :3000 (see `web/next.config.ts`, override with `API_ORIGIN`), so the API must be running for the UI to load data.
- **Worker** (`npm run worker`, BullMQ scheduler) needs Redis. Not required for the API or Meet UI to run.

### Runtime caveat (important)
- This repo defaults to a Windows-only "production" runtime. On Linux/Cloud you MUST set `PICKMETALK_RUNTIME=test` (and `MJ_PRODUCTION_MODE=test`) in `.env`, otherwise the `mj:*` / factory scripts throw via `assertProductionRuntime` ("Production mode requires Windows"). The API server and Meet UI themselves do not call that assertion, but keep the test runtime set for all script work. `npm test` already forces the test runtime via `vitest.config.ts`.
- Firebase and Redis are optional at API startup: push falls back to a mock when `FIREBASE_*` env vars are empty, and Redis is only touched by the worker.

### Postgres & Redis (installed, but not systemd-managed)
- Neither runs automatically on boot. Start them each session:
  - Postgres: `sudo pg_ctlcluster 16 main start`
  - Redis: `sudo redis-server --daemonize yes`
- Local DB used for dev: role/db `pickmetalk` / `pickmetalk` (password `pickmetalk`). `.env` `DATABASE_URL` points at `postgresql://pickmetalk:pickmetalk@localhost:5432/pickmetalk`.

### First-time / empty DB init
- `.env` is git-ignored — create it from `.env.example` if missing (local `DATABASE_URL`, `REDIS_URL`, `PICKMETALK_RUNTIME=test`).
- Apply schema + seed when the DB is empty (not part of the startup update script): `npm run db:push` then `npm run db:seed`. Seeds 5 characters + a demo user (`00000000-0000-0000-0000-000000000010`) / userCharacter (`00000000-0000-0000-0000-000000000020`). Both are idempotent (upserts).

### Lint / test / build
- Tests: `npm test` (vitest, root). No root `lint` script.
- Lint: `npm run lint` inside `web/` (`next lint`) — this is the only lint target.
- Build: `npm run build` (root, `tsc`) / `npm run web:build` (Next.js).

### Known pre-existing issue
- The Meet UI chat screen (`web/src/components/chat/ChatScreen.tsx`) logs a React "Maximum update depth exceeded" loop and sending a message may not append to the thread. This is an app-code bug, unrelated to environment setup.

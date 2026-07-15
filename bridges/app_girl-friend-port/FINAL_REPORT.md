# PickMeTalk Architecture Integration — Final Report

**Date:** 2026-07-15  
**Ops branch:** `cursor/architecture-bridge-00f8`  
**Product branch (local):** `cursor/architecture-integration-00f8` @ `c8aa5e73501d3c70fda45918f7e6ae578d5d2c90`

---

## 1. Analysis summary

| Repo | Role | Keep / port |
|------|------|-------------|
| `app_girl-friend` | Product (pickmetalk.com) | Unique product home |
| `ai_girlfriend_app` | Ops (Windows MJ / library) | Never merge into product |

Repos are **not** git forks (no common ancestor). Merge of `main` branches is forbidden and unnecessary.

---

## 2. Product feature list (must have)

AI chat, characters, relationship, memory, payments, Android/iOS, Vercel, Next API, Supabase auth, Photo Chat UI, Push Notification, Photo Push scheduler.

## 3. Ops-only feature list (must NOT port)

Midjourney Production, Prompt Catalog builder, Photo Library FS, Face Verification pipelines, Quality Score workers, Watch Folder, Thumbnails batch, Windows paths, Queue/Redis/BullMQ, Express, Prisma, Dashboard batch tools.

## 4. Minimum selective port (done in product package)

| Item | Status |
|------|--------|
| Photo Push foundation | From draft PR #15 base |
| Storage catalog select | ✅ `lib/photoCatalog/*` |
| Photo viewer | ✅ tap-to-fullscreen |
| Album API + `/album` UI | ✅ |
| Web Push APIs + settings | ✅ (VAPID optional) |
| Natural Conversation polish | ✅ → `responsePostProcess` |
| Stage dialogue (5-level) | ✅ `stageDialogue.ts` |
| Additive migration 011 | ✅ |
| Ops publish helper | ✅ `scripts/publish-photo-to-product.ts` |

Deferred (by design): Adaptive DNA full persistence, Living AI day DB, Meet UI, FCM native.

---

## 5. Conflict analysis

| Conflict | Resolution |
|----------|------------|
| Express vs Next | Only Next API routes added |
| Prisma vs Supabase | Additive SQL migrations only |
| Ops 8-stage vs product 5-level | Compressed mapping in `stageDialogue` |
| `yunseo` vs `yoonseo` | Normalize on ingest + config |
| PR #15 mixed premium | Kept as base; not rewritten |

---

## 6–9. Branch / PR / tests

### Product (`app_girl-friend`)

- Branch: `cursor/architecture-integration-00f8`
- Commit: `c8aa5e7`
- **PR: blocked** — GitHub App `cursor[bot]` has no push permission on `app_girl-friend` (403)
- Apply package: `bridges/app_girl-friend-port/` (see `APPLY.md`)

### Ops (`ai_girlfriend_app`) — this PR

- Branch: `cursor/architecture-bridge-00f8`
- Contents: bridge docs, publish script, product patch package, this report

### Verification (product local)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS (Next.js 15.5.18) |

---

## 10. Change inventory (product delta vs photo-push)

See `bridges/app_girl-friend-port/FILES_CHANGED_VS_PHOTO_PUSH.txt`

### Migrations

- `010_photo_push_system.sql` (from PR #15)
- `011_photo_storage_bridge.sql` — `public_url`, `category`, `is_active`, `quality_score`, `memory_album_items`

### API

- `GET /api/album`
- `GET /api/photos/search`
- `GET /api/push/vapid-public-key`
- `POST|DELETE /api/push/web-subscription`
- Existing: `/api/cron/photo-push`, track route

### UI

- Photo viewer (chat bubble)
- `/album` page + BottomNav tab
- Settings: Web Push enable + album link

### DB

- Additive only; no drops

---

## Recommended architecture going forward

1. **Grant Cursor write access** to `app_girl-friend` → push product branch → open product PR
2. Merge photo-push / architecture into product `main`
3. Apply Supabase migrations `010`+`011`
4. Ops: after QC, run `npx tsx scripts/publish-photo-to-product.ts ...`
5. Keep repos separate forever; link only via Storage + catalog table

```
[Ops generates] → Storage/CDN + character_photo_assets → [Product delivers]
```

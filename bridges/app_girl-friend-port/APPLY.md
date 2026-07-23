# Apply product architecture port to `app_girl-friend`

This Cloud Agent can **read** `app_girl-friend` but cannot **push** (Cursor GitHub App
lacks write permission on that repo). Use this package once write access is granted,
or apply locally and open the PR yourself.

## Recommended (cleanest)

1. Install Cursor GitHub App (or grant write) on `kimeunsun109-debug/app_girl-friend`
2. Push local branch from the implementer's machine if you have a clone of the work:

```bash
# If you have the product clone with branch cursor/architecture-integration-00f8:
git push -u origin cursor/architecture-integration-00f8
gh pr create --base main --head cursor/architecture-integration-00f8 \
  --title "feat: Product↔Ops architecture bridge (photo push + selective AI)" \
  --body-file bridges/... # or paste PR body from FINAL_REPORT
```

## Apply via patch (from this ops repo)

### Option A — On top of existing photo-push PR #15 branch

```bash
cd app_girl-friend
git fetch origin
git checkout -b cursor/architecture-integration-00f8 origin/cursor/photo-push-system-e030
git am /path/to/pickmetalk-ops/bridges/app_girl-friend-port/011-architecture-on-photo-push.patch
npm install
npm run lint && npx tsc --noEmit && npm run build
```

### Option B — Full stack vs main (includes PR #15 photo push + Korea beta extras)

```bash
cd app_girl-friend
git checkout -b cursor/architecture-integration-00f8 origin/main
git am /path/to/pickmetalk-ops/bridges/app_girl-friend-port/architecture-integration.patch
npm install
npm run lint && npx tsc --noEmit && npm run build
```

> Option B also brings draft PR #15 premium/i18n changes that were already on the photo-push branch.
> Prefer Option A if you want photo-push merged as its own PR first.

## After apply

1. Run migrations `010_photo_push_system.sql` + `011_photo_storage_bridge.sql` on Supabase
2. Set Vercel envs: `CRON_SECRET`, `PHOTO_STORAGE_BUCKET`, optional VAPID keys
3. Ops publishes photos → Storage → `character_photo_assets` (see `docs/PRODUCT_OPS_BRIDGE.md` in ops)

## Commit SHA (product local)

`c8aa5e73501d3c70fda45918f7e6ae578d5d2c90`

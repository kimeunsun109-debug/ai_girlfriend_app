# Apply 014 — Vercel build log cleanup

Fixes:
- `npm warn deprecated` (sourcemap-codec, inflight, glob@7, source-map beta) from unused `@ducanh2912/next-pwa`
- `warn: kickline sync failed` / Python traceback on Vercel

PWA is already disabled (`ENABLE_PWA` unset). Static `public/sw.js` stays for Web Push.

```powershell
cd C:\Users\user\pickmetalk
git pull origin main
git apply --check bridges/app_girl-friend-port/014-vercel-build-cleanup.patch
git apply bridges/app_girl-friend-port/014-vercel-build-cleanup.patch

git add package.json package-lock.json next.config.ts scripts/run_sync_kicklines.mjs scripts/sync_kicklines_from_xlsx.py
git commit -m "fix: remove unused next-pwa deps and silence kickline sync on Vercel"
git push origin main
```

Redeploy on Vercel (Production).

To re-enable PWA later: `npm i @ducanh2912/next-pwa` and restore `withPWA` wrapper with `ENABLE_PWA=true`.

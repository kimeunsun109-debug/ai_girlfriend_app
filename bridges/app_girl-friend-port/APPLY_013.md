# Apply 013 — kickline sync Vercel warning fix

Removes `warn: kickline sync failed (exit 1)` and Python traceback from Vercel build logs.

```powershell
cd C:\Users\user\pickmetalk
git fetch origin
git apply bridges/app_girl-friend-port/013-kickline-sync-vercel.patch
# or from pickmetalk-ops repo:
# git am < path\to\013-kickline-sync-vercel.patch

git add scripts/run_sync_kicklines.mjs scripts/sync_kicklines_from_xlsx.py
git commit -m "fix: skip kickline xlsx sync on Vercel without openpyxl"
git push origin main
```

Then **Redeploy** on Vercel (Production, branch `main`).

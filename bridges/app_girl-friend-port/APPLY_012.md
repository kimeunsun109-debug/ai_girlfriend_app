# Apply 012 — rename branding + Hobby daily cron

Applies onto product branch `cursor/architecture-integration-00f8` (after Bugbot fix `a833679`).

```powershell
cd C:\Users\user\app_girl-friend   # or pickmetalk after folder rename
git fetch origin
git checkout cursor/architecture-integration-00f8
git pull origin cursor/architecture-integration-00f8

Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kimeunsun109-debug/ai_girlfriend_app/cursor/architecture-bridge-00f8/bridges/app_girl-friend-port/012-rename-and-cron.patch" -OutFile "$env:TEMP\012-rename-and-cron.patch"

git am "$env:TEMP\012-rename-and-cron.patch"
git push -u origin cursor/architecture-integration-00f8
```

Then rename GitHub + local folders using `docs/RENAME_PICKMETALK.md` (in product after patch, or ops `docs/RENAME_PICKMETALK.md`).

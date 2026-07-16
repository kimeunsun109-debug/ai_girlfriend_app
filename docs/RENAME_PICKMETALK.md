# Rename to pickmetalk / pickmetalk-ops

| Role | Old | New |
|------|-----|-----|
| Product | `app_girl-friend` | **`pickmetalk`** |
| Ops (this repo) | `ai_girlfriend_app` | **`pickmetalk-ops`** |

## GitHub (browser)

1. https://github.com/kimeunsun109-debug/app_girl-friend/settings → rename → `pickmetalk`
2. https://github.com/kimeunsun109-debug/ai_girlfriend_app/settings → rename → `pickmetalk-ops`
3. Vercel + Cursor Cloud: confirm Git connection still points at the renamed repos

## Local Windows

```powershell
# Product
Rename-Item C:\Users\user\app_girl-friend pickmetalk -ErrorAction SilentlyContinue
cd C:\Users\user\pickmetalk
git remote set-url origin https://github.com/kimeunsun109-debug/pickmetalk.git

# Ops
Rename-Item C:\Users\user\ai_girlfriend_app pickmetalk-ops -ErrorAction SilentlyContinue
# or clone fresh:
# git clone https://github.com/kimeunsun109-debug/pickmetalk-ops.git C:\Users\user\pickmetalk-ops
cd C:\Users\user\pickmetalk-ops
git remote set-url origin https://github.com/kimeunsun109-debug/pickmetalk-ops.git
```

## Product patch still to apply (cron + rename docs)

From this ops repo after `git pull` on `cursor/architecture-bridge-00f8`:

```powershell
cd C:\Users\user\pickmetalk   # or app_girl-friend until renamed
git fetch origin
git checkout cursor/architecture-integration-00f8
git pull
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kimeunsun109-debug/ai_girlfriend_app/cursor/architecture-bridge-00f8/bridges/app_girl-friend-port/012-rename-and-cron.patch" -OutFile "$env:TEMP\012-rename-and-cron.patch"
git am "$env:TEMP\012-rename-and-cron.patch"
git push origin cursor/architecture-integration-00f8
```

(After GitHub rename, swap `ai_girlfriend_app` → `pickmetalk-ops` in the raw URL.)

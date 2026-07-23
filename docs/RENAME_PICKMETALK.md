# Rename to pickmetalk / pickmetalk-ops

| Role | Old | New | Status |
|------|-----|-----|--------|
| Product | `app_girl-friend` / `pickmetalk-` | **`pickmetalk`** | GitHub/local as applicable |
| Ops (this repo) | `ai_girlfriend_app` | **`pickmetalk-ops`** | **Local folder renamed** → `C:\Users\user\pickmetalk-ops` |

## Local Windows (Ops — done)

```powershell
cd C:\Users\user\pickmetalk-ops
git remote -v
# expect: https://github.com/kimeunsun109-debug/pickmetalk-ops.git
# if still old URL:
git remote set-url origin https://github.com/kimeunsun109-debug/pickmetalk-ops.git
```

## GitHub (if not finished)

1. https://github.com/kimeunsun109-debug/app_girl-friend/settings → rename → `pickmetalk` (or fix `pickmetalk-` trailing dash)
2. Ops remote already redirects/renamed to `pickmetalk-ops` — confirm Settings name matches
3. Vercel + Cursor Cloud: confirm Git connection still points at the renamed repos

## Product local (if still old name)

```powershell
Rename-Item C:\Users\user\app_girl-friend pickmetalk -ErrorAction SilentlyContinue
# or: Rename-Item C:\Users\user\pickmetalk- pickmetalk -ErrorAction SilentlyContinue
cd C:\Users\user\pickmetalk
git remote set-url origin https://github.com/kimeunsun109-debug/pickmetalk.git
```

Helper script (idempotent): `scripts/rename-local-folders.ps1`

## Product patch still to apply (cron + rename docs)

From ops after `git pull`:

```powershell
cd C:\Users\user\pickmetalk
git fetch origin
git checkout cursor/architecture-integration-00f8
git pull
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kimeunsun109-debug/pickmetalk-ops/cursor/hybrid-photo-factory-00f8/bridges/app_girl-friend-port/012-rename-and-cron.patch" -OutFile "$env:TEMP\012-rename-and-cron.patch"
git am "$env:TEMP\012-rename-and-cron.patch"
git push origin cursor/architecture-integration-00f8
```

# Product ↔ Ops content bridge

Ops owns **generation**. Product owns **delivery**.

```
Windows Ops (this repo)
  mj:production / universe:watch / QC / face / thumbnail
        ↓
  scripts/publish-photo-to-product.ts  (or manual upsert)
        ↓
  Supabase Storage bucket: character-photos
  Table: character_photo_assets  (shared product DB)
        ↓
Product app_girl-friend
  selectCatalogPhoto → photo push cron → chat / album / web push
```

## Required catalog fields (product expects)

| Column | Notes |
|--------|--------|
| `character_id` | `yuna` · `narin` · **`yoonseo`** · `eunha` · `jiyu` (not `yunseo`) |
| `scenario_id` | Product scenario id or category slug |
| `storage_path` | `{character_id}/{category}/{hash}.ext` |
| `public_url` | Optional CDN URL |
| `category` | `coffee`, `selfie`, `rain`, … |
| `emotion` | `happy`, `sad`, `sleepy`, … |
| `hash_fingerprint` | Dedup |
| `is_active` | `true` after QC pass |
| `quality_score` | Optional ranking |

## Do not

- Call product chat APIs from MJ workers
- Copy Windows paths into product
- Publish failed QC images (`is_active=false`)

## Env for publish helper

```
PRODUCT_SUPABASE_URL=
PRODUCT_SUPABASE_SERVICE_ROLE_KEY=
PHOTO_STORAGE_BUCKET=character-photos
PHOTO_CDN_BASE_URL=   # optional
```

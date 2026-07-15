/**
 * Publish a ready photo into the product catalog (Supabase Storage + character_photo_assets).
 * Uses REST only (no new npm deps).
 *
 *   npx tsx scripts/publish-photo-to-product.ts \
 *     --file ./out/yuna_coffee_001.jpg \
 *     --character yuna \
 *     --category coffee \
 *     --scenario coffee_cafe \
 *     --emotion happy
 *
 * Env: PRODUCT_SUPABASE_URL, PRODUCT_SUPABASE_SERVICE_ROLE_KEY
 * Optional: PHOTO_STORAGE_BUCKET, PHOTO_CDN_BASE_URL
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { basename, extname } from 'node:path';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function normalizeCharacter(id: string): string {
  return id === 'yunseo' ? 'yoonseo' : id;
}

async function main() {
  const file = arg('file');
  const character = normalizeCharacter(arg('character') ?? '');
  const category = arg('category') ?? 'selfie';
  const scenario = arg('scenario') ?? category;
  const emotion = arg('emotion') ?? 'happy';
  let fingerprint = arg('fingerprint');

  if (!file || !character) {
    console.error('Required: --file --character [--category --scenario --emotion --fingerprint]');
    process.exit(1);
  }
  if (!existsSync(file)) {
    console.error('File not found:', file);
    process.exit(1);
  }

  const url = (process.env.PRODUCT_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const key =
    process.env.PRODUCT_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    console.error('Set PRODUCT_SUPABASE_URL and PRODUCT_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const bucket = process.env.PHOTO_STORAGE_BUCKET ?? 'character-photos';
  const bytes = readFileSync(file);
  fingerprint = fingerprint ?? createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const ext = extname(file).replace('.', '') || 'jpg';
  const storagePath = `${character}/${category}/${fingerprint}.${ext}`;
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const uploadRes = await fetch(
    `${url}/storage/v1/object/${bucket}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: bytes,
    }
  );
  if (!uploadRes.ok) {
    console.error('Storage upload failed:', uploadRes.status, await uploadRes.text());
    process.exit(1);
  }

  const cdn = process.env.PHOTO_CDN_BASE_URL?.replace(/\/$/, '');
  const publicUrl = cdn
    ? `${cdn}/${storagePath}`
    : `${url}/storage/v1/object/public/${bucket}/${storagePath}`;

  const row = {
    character_id: character,
    scenario_id: scenario,
    storage_path: storagePath,
    public_url: publicUrl,
    category,
    emotion,
    tags: [category, emotion, basename(file)],
    hash_fingerprint: fingerprint,
    is_active: true,
    quality_score: Number(arg('quality') ?? 80),
    min_level: Number(arg('minLevel') ?? 1),
    min_affection: 0,
    is_premium: false,
  };

  const insertRes = await fetch(`${url}/rest/v1/character_photo_assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!insertRes.ok) {
    console.error('Catalog insert failed:', insertRes.status, await insertRes.text());
    process.exit(1);
  }

  const inserted = await insertRes.json();
  console.log(JSON.stringify({ ok: true, asset: inserted }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

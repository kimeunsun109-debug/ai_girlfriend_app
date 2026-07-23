#!/usr/bin/env npx tsx
/**
 * Build Midjourney Master Manifest (10–20 shots ONLY — not mass production)
 *
 * npm run factory:master-manifest -- --character=yuna
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildCharacterMjCommand } from '../src/config/character-face-reference.config.js';
import { PHOTO_UNIVERSE_DATA_ROOT } from '../src/config/photo-universe.config.js';
import {
  MASTER_SHOT_SPECS,
  masterShotScenePrompt,
  bootstrapMasterDataset,
} from '../src/lib/hybrid-factory/index.js';
import { bootstrapPhotoLibrary } from '../src/lib/midjourney-production/index.js';

function parseArgs() {
  const char = process.argv.find((a) => a.startsWith('--character='))?.split('=')[1] ?? 'yuna';
  return { character: char };
}

async function main() {
  const { character } = parseArgs();
  bootstrapPhotoLibrary();
  bootstrapMasterDataset([character]);

  const outDir = join(PHOTO_UNIVERSE_DATA_ROOT, 'master-manifests', character, 'discord');
  mkdirSync(outDir, { recursive: true });

  const prefix = character.toUpperCase();
  const jobs = MASTER_SHOT_SPECS.map((spec, i) => {
    const scene = masterShotScenePrompt(spec);
    const cmd = buildCharacterMjCommand(character, scene, 'different person, face morph');
    const pad = String(i + 1).padStart(3, '0');
    const file = `${prefix}_MASTER_${pad}.md`;
    writeFileSync(join(outDir, file), `${cmd}\n`);
    return { file, shotId: spec.id, cmd };
  });

  writeFileSync(
    join(PHOTO_UNIVERSE_DATA_ROOT, 'master-manifests', character, 'README.md'),
    `# ${character} Master Dataset (Midjourney ONLY)

Generate **${jobs.length}** reference images. Save downloads to:

\`master/${character}/_inbox/\`

Then:

\`\`\`
npm run factory:profile -- --character=${character}
\`\`\`

Do NOT use Midjourney for mass production — that is RTX local Factory.
`
  );

  console.log(`✓ Master manifest: ${jobs.length} files → ${outDir}`);
  console.log(`  ${prefix}_MASTER_001.md … ${prefix}_MASTER_${String(jobs.length).padStart(3, '0')}.md`);
  console.log(`\nAfter MJ download → copy into master/${character}/_inbox/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env npx tsx
/**
 * 유나 20장 Production 테스트
 * npm run mj:yuna-test
 * npm run mj:yuna-test -- --ingest
 */
import 'dotenv/config';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { YUNA_FACE_IDENTITY, YUNA_MJ_SUFFIX } from '../src/config/yuna-face-reference.config.js';
import {
  bootstrapPhotoLibrary,
  productionQueue,
  productionDashboard,
  faceVerifier,
  ingestPipeline,
  getProductionDb,
  closeProductionDb,
} from '../src/lib/midjourney-production/index.js';
import { promptSelector } from '../src/lib/midjourney-production/prompt-selector.js';
import { MJ_PRODUCTION_PATHS } from '../src/config/midjourney-production.config.js';
import { PHOTO_UNIVERSE_DATA_ROOT } from '../src/config/photo-universe.config.js';

const COUNT = 20;
const ARTIFACTS = '/opt/cursor/artifacts/assets';
const REF_DIR = join(process.cwd(), 'reference/yuna');
const OUTPUT_DIR = join(PHOTO_UNIVERSE_DATA_ROOT, 'yuna-test-20');
const UPLOADS = '/home/ubuntu/.cursor/projects/workspace/uploads';

function compactSceneFromPrompt(fullPrompt: string): string {
  const sceneMatch = fullPrompt.match(/## Scene[^\n]*\n([\s\S]*?)(?=\n## |$)/);
  if (sceneMatch?.[1]) {
    return sceneMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(', ');
  }
  const visualMatch = fullPrompt.match(/## Character visual base\n([^\n]+)/);
  return visualMatch?.[1]?.trim() ?? fullPrompt.slice(0, 180);
}

function buildMjCommand(prompt: string, negativePrompt: string): string {
  const scene = compactSceneFromPrompt(prompt);
  const fullPrompt = [
    YUNA_FACE_IDENTITY.identityPrompt,
    scene,
    'natural smartphone selfie, photorealistic Korean woman Yuna, same face as reference',
    'Shot on iPhone, casual daily life, natural lighting, no AI beauty filter',
  ].join('. ');
  return `/imagine prompt: ${fullPrompt} --no ${YUNA_FACE_IDENTITY.identityNegative}, ${negativePrompt} ${YUNA_MJ_SUFFIX}`;
}

async function setupReferences(): Promise<string[]> {
  mkdirSync(REF_DIR, { recursive: true });
  mkdirSync(join(MJ_PRODUCTION_PATHS.faceRefs, 'yuna'), { recursive: true });

  const copied: string[] = [];
  const yunaArtifacts = [
    'yuna_campus_selfie.jpg',
    'yuna_finger_heart.jpg',
    'yuna_hair_salon.jpg',
    'yuna_rain_umbrella.jpg',
    'yuna_sad_pouty.jpg',
    'yuna_nail_art.jpg',
  ];

  for (const name of yunaArtifacts) {
    const src = join(ARTIFACTS, name);
    if (!existsSync(src)) continue;
    const dest = join(REF_DIR, name);
    const faceDest = join(MJ_PRODUCTION_PATHS.faceRefs, 'yuna', name);
    copyFileSync(src, dest);
    copyFileSync(src, faceDest);
    copied.push(dest);
  }

  const mp4Src = join(UPLOADS, '______8f6d.mp4');
  if (existsSync(mp4Src)) {
    copyFileSync(mp4Src, join(REF_DIR, '유나_인사.mp4'));
  }

  if (copied.length > 0) {
    await faceVerifier.bootstrapReference('yuna', copied[0]!);
    console.log(`✓ Face reference: ${copied.length} images → ${copied[0]}\n`);
  }
  return copied;
}

async function runIngestSimulation(): Promise<void> {
  console.log('\n─── Ingest Pipeline Test ───\n');
  productionQueue.activateNextJob(productionQueue.getActiveRun()!.id);

  const refImages = readdirSync(REF_DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  let ok = 0;
  for (const file of refImages) {
    const path = join(REF_DIR, file);
    const result = await ingestPipeline.ingestFromImport(path);
    const face = result.faceSimilarity != null ? ` ${result.faceSimilarity}% face` : '';
    console.log(`  ${file}: ${result.action} — ${result.message}${face}`);
    if (result.ok) ok++;
  }
  console.log(`\nIngested: ${ok}/${refImages.length}`);
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  유나 20장 Midjourney Production Test    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  process.env.PHOTO_LIBRARY_ROOT =
    process.env.PHOTO_LIBRARY_ROOT ?? join(process.cwd(), 'test-fixtures/yuna-photo-library');
  process.env.MJ_IMPORT_WATCH_FOLDER =
    process.env.MJ_IMPORT_WATCH_FOLDER ?? join(process.cwd(), 'test-fixtures/mj-import');

  bootstrapPhotoLibrary();
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(process.env.MJ_IMPORT_WATCH_FOLDER, { recursive: true });

  await setupReferences();

  const remaining = promptSelector.remainingCount('yuna');
  console.log(`Prompt Catalog unused: ${remaining} prompts\n`);

  if (productionQueue.getActiveRun() && !process.argv.includes('--new')) {
    console.log('Active run exists — use --new to create fresh batch\n');
  } else {
    productionQueue.createRun({ characterOrder: ['yuna'], photosPerCharacter: COUNT });
  }

  const run = productionQueue.getActiveRun()!;
  const db = getProductionDb();
  const jobs = db.listJobsForRun(run.id);

  const enriched = jobs.map((j, i) => ({
    index: i + 1,
    scenario: j.folderSlug,
    promptId: j.promptId,
    targetFolder: j.targetFolder,
    midjourneyCommand: buildMjCommand(j.prompt, j.negativePrompt ?? ''),
    promptPreview: j.prompt.slice(0, 120),
  }));

  writeFileSync(
    join(OUTPUT_DIR, 'yuna-20-manifest.json'),
    JSON.stringify(
      {
        character: 'yuna',
        runId: run.id,
        count: enriched.length,
        identityLock: YUNA_FACE_IDENTITY.identityPrompt,
        createdAt: new Date().toISOString(),
        jobs: enriched,
      },
      null,
      2
    )
  );

  const md: string[] = ['# 유나 20장 Midjourney 테스트', '', '## Identity Lock', '', YUNA_FACE_IDENTITY.identityPrompt, ''];
  for (const j of enriched) {
    md.push(`## ${j.index}. ${j.scenario}`, `**저장:** \`${j.targetFolder}\``, '', '```', j.midjourneyCommand, '```', '');
  }
  writeFileSync(join(OUTPUT_DIR, 'YUNA_20_MJ_COMMANDS.md'), md.join('\n'));

  console.log(`Generated ${enriched.length} jobs (run ${run.id.slice(0, 8)}…)\n`);
  if (enriched[0]) {
    console.log('─── Job 1 / 20 ───\n');
    console.log(enriched[0].midjourneyCommand);
    console.log(`\n저장: ${enriched[0].targetFolder}`);
  }

  console.log(`\n✓ ${OUTPUT_DIR}/yuna-20-manifest.json`);
  console.log(`✓ ${OUTPUT_DIR}/YUNA_20_MJ_COMMANDS.md`);

  productionQueue.activateNextJob(run.id);
  console.log(productionDashboard.renderConsole());

  if (process.argv.includes('--ingest')) {
    await runIngestSimulation();
    console.log(productionDashboard.renderConsole());
  } else {
    console.log('\n💡 Ingest 테스트: npm run mj:yuna-test -- --ingest');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => closeProductionDb());

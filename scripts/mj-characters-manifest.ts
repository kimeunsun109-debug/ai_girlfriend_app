#!/usr/bin/env npx tsx
/**
 * 5캐릭터 MJ Production Manifest 생성
 *
 * npm run mj:characters-manifest
 * npm run mj:characters-manifest -- --count=20
 * npm run mj:characters-manifest -- --character=narin
 * npm run mj:characters-manifest -- --new
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  bootstrapPhotoLibrary,
  productionQueue,
  productionDashboard,
  closeProductionDb,
} from '../src/lib/midjourney-production/index.js';
import { promptSelector } from '../src/lib/midjourney-production/prompt-selector.js';
import {
  buildCharacterMjCommand,
  CHARACTER_SLUGS,
  getCharacterFaceIdentity,
} from '../src/config/character-face-reference.config.js';
import { MJ_CHARACTER_ORDER } from '../src/config/midjourney-production.config.js';
import { PHOTO_UNIVERSE_DATA_ROOT } from '../src/config/photo-universe.config.js';

const OUTPUT_ROOT = join(PHOTO_UNIVERSE_DATA_ROOT, 'characters-manifest');

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

function parseArgs() {
  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const charArg = process.argv.find((a) => a.startsWith('--character='));
  const count = countArg ? Number(countArg.split('=')[1]) : Number(process.env.MJ_PHOTOS_PER_CHARACTER ?? 20);
  const character = charArg?.split('=')[1];
  const characterOrder = character
    ? [character]
    : [...MJ_CHARACTER_ORDER];
  return { count, characterOrder, forceNew: process.argv.includes('--new') };
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  PickMeTalk 5-Character MJ Manifest      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  bootstrapPhotoLibrary();
  mkdirSync(OUTPUT_ROOT, { recursive: true });

  const { count, characterOrder, forceNew } = parseArgs();

  for (const slug of characterOrder) {
    if (!CHARACTER_SLUGS.includes(slug as (typeof CHARACTER_SLUGS)[number])) {
      console.warn(`⚠ Unknown character: ${slug} — skipping`);
      continue;
    }
    const identity = getCharacterFaceIdentity(slug);
    if (!identity) continue;
    console.log(`── ${identity.name} (${slug}) ──`);
    console.log(`   Identity: ${identity.identityPrompt.slice(0, 80)}…`);
    console.log(`   Catalog unused: ${promptSelector.remainingCount(slug)} prompts\n`);
  }

  if (productionQueue.getActiveRun() && !forceNew) {
    console.log('Active run exists — use --new to create fresh batch\n');
  } else {
    productionQueue.createRun({ characterOrder, photosPerCharacter: count });
  }

  const run = productionQueue.getActiveRun()!;
  const { getProductionDb } = await import('../src/lib/midjourney-production/production-db.js');
  const db = getProductionDb();
  const allJobs = db.listJobsForRun(run.id);

  const byCharacter: Record<string, typeof allJobs> = {};
  for (const job of allJobs) {
    if (!byCharacter[job.character]) byCharacter[job.character] = [];
    byCharacter[job.character]!.push(job);
  }

  const manifestSummary: Array<{
    character: string;
    name: string;
    count: number;
    manifestPath: string;
    commandsPath: string;
  }> = [];

  for (const slug of characterOrder) {
    const charJobs = byCharacter[slug] ?? [];
    const identity = getCharacterFaceIdentity(slug);
    if (!identity || charJobs.length === 0) continue;

    const enriched = charJobs.map((j, i) => ({
      index: i + 1,
      scenario: j.folderSlug,
      promptId: j.promptId,
      targetFolder: j.targetFolder,
      midjourneyCommand: buildCharacterMjCommand(
        slug,
        compactSceneFromPrompt(j.prompt),
        j.negativePrompt ?? ''
      ),
      promptPreview: j.prompt.slice(0, 120),
    }));

    const charDir = join(OUTPUT_ROOT, slug);
    mkdirSync(charDir, { recursive: true });

    const manifestPath = join(charDir, `${slug}-manifest.json`);
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          character: slug,
          name: identity.name,
          runId: run.id,
          count: enriched.length,
          identityLock: identity.identityPrompt,
          createdAt: new Date().toISOString(),
          jobs: enriched,
        },
        null,
        2
      )
    );

    const md: string[] = [
      `# ${identity.name} (${slug}) Midjourney Commands`,
      '',
      `**Count:** ${enriched.length} | **Run:** ${run.id.slice(0, 8)}…`,
      '',
      '## Identity Lock',
      '',
      identity.identityPrompt,
      '',
    ];
    for (const j of enriched) {
      md.push(
        `## ${j.index}. ${j.scenario}`,
        `**저장:** \`${j.targetFolder}\``,
        '',
        '```',
        j.midjourneyCommand,
        '```',
        ''
      );
    }
    const commandsPath = join(charDir, `${slug.toUpperCase()}_MJ_COMMANDS.md`);
    writeFileSync(commandsPath, md.join('\n'));

    manifestSummary.push({
      character: slug,
      name: identity.name,
      count: enriched.length,
      manifestPath,
      commandsPath,
    });

    console.log(`✓ ${identity.name}: ${enriched.length} jobs`);
    console.log(`  ${manifestPath}`);
    console.log(`  ${commandsPath}\n`);
  }

  const summaryPath = join(OUTPUT_ROOT, 'all-characters-summary.json');
  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        runId: run.id,
        photosPerCharacter: count,
        characterOrder,
        totalJobs: allJobs.length,
        createdAt: new Date().toISOString(),
        characters: manifestSummary,
      },
      null,
      2
    )
  );

  productionQueue.activateNextJob(run.id);
  console.log(productionDashboard.renderConsole());
  console.log(`\n✓ Summary: ${summaryPath}`);
  console.log('\n💡 Discord MJ로 생성 후 Downloads/PickMeTalk_MJ 에 저장');
  console.log('💡 Ingest: npm run mj:production');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => closeProductionDb());

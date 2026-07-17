#!/usr/bin/env npx tsx
/**
 * Character Midjourney Manifest 생성
 *
 * Per-file Discord paste targets (Discord ~2000 char limit):
 *   data/photo-universe/characters-manifest/yuna/YUNA_001.md
 *
 * npm run mj:characters-manifest
 * npm run mj:characters-manifest -- --count=150 --character=yuna --new
 * npm run mj:characters-manifest -- --count=150 --new
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
/** Discord message hard limit — keep /imagine paste under this */
const DISCORD_SAFE_CHARS = 1900;

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

function fitDiscordCommand(cmd: string): string {
  if (cmd.length <= DISCORD_SAFE_CHARS) return cmd;
  // Truncate inside prompt body before --no / suffixes when possible
  const marker = ' --no ';
  const idx = cmd.lastIndexOf(marker);
  if (idx > 100) {
    const head = cmd.slice(0, idx);
    const tail = cmd.slice(idx);
    const budget = DISCORD_SAFE_CHARS - tail.length - 3;
    if (budget > 80) return `${head.slice(0, budget)}...${tail}`;
  }
  return `${cmd.slice(0, DISCORD_SAFE_CHARS - 3)}...`;
}

function parseArgs() {
  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const charArg = process.argv.find((a) => a.startsWith('--character='));
  const count = countArg
    ? Number(countArg.split('=')[1])
    : Number(process.env.MJ_PHOTOS_PER_CHARACTER ?? 150);
  const character = charArg?.split('=')[1];
  const characterOrder = character ? [character] : [...MJ_CHARACTER_ORDER];
  return { count, characterOrder, forceNew: process.argv.includes('--new') };
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  PickMeTalk Character MJ Manifest        ║');
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
    console.log(`   Catalog unused: ${promptSelector.remainingCount(slug)} prompts\n`);
  }

  if (productionQueue.getActiveRun() && !forceNew) {
    console.log('Active run exists — reusing (pass --new for a fresh batch)\n');
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
    manifestDir: string;
    fileCount: number;
  }> = [];

  let totalMdFiles = 0;

  for (const slug of characterOrder) {
    const charJobs = byCharacter[slug] ?? [];
    const identity = getCharacterFaceIdentity(slug);
    if (!identity || charJobs.length === 0) continue;

    const charDir = join(OUTPUT_ROOT, slug);
    const individualDir = join(charDir, 'discord');
    mkdirSync(individualDir, { recursive: true });

    const prefix = slug.toUpperCase();
    const enriched = charJobs.map((j, i) => {
      const raw = buildCharacterMjCommand(
        slug,
        compactSceneFromPrompt(j.prompt),
        j.negativePrompt ?? ''
      );
      const midjourneyCommand = fitDiscordCommand(raw);
      const index = i + 1;
      const pad = String(index).padStart(3, '0');
      const fileName = `${prefix}_${pad}.md`;
      // Discord paste file: /imagine command only
      writeFileSync(join(individualDir, fileName), `${midjourneyCommand}\n`, 'utf-8');
      totalMdFiles += 1;
      return {
        index,
        fileName,
        scenario: j.folderSlug,
        promptId: j.promptId,
        targetFolder: j.targetFolder,
        midjourneyCommand,
        chars: midjourneyCommand.length,
      };
    });

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

    const indexMd: string[] = [
      `# ${identity.name} (${slug}) — Discord Manifest Index`,
      '',
      `**Count:** ${enriched.length} | **Run:** ${run.id.slice(0, 8)}…`,
      '',
      'Paste each `discord/*.md` file contents into Discord (one /imagine per message).',
      '',
      '| # | File | Category | Chars | Save after download |',
      '|---|------|----------|-------|---------------------|',
    ];
    for (const j of enriched) {
      indexMd.push(
        `| ${j.index} | \`${j.fileName}\` | ${j.scenario} | ${j.chars} | \`${j.targetFolder}\` |`
      );
    }
    const indexPath = join(charDir, `${prefix}_INDEX.md`);
    writeFileSync(indexPath, indexMd.join('\n') + '\n');

    // Combined commands (optional bulk view)
    const combined: string[] = [
      `# ${identity.name} — all /imagine commands`,
      '',
      'Prefer individual files in `discord/` for Discord length limits.',
      '',
    ];
    for (const j of enriched) {
      combined.push(`## ${j.fileName}`, '', '```', j.midjourneyCommand, '```', '');
    }
    writeFileSync(join(charDir, `${prefix}_MJ_COMMANDS.md`), combined.join('\n'));

    manifestSummary.push({
      character: slug,
      name: identity.name,
      count: enriched.length,
      manifestDir: individualDir,
      fileCount: enriched.length,
    });

    console.log(`✓ ${identity.name}: ${enriched.length} jobs → ${individualDir}`);
    console.log(`  ${prefix}_001.md … ${prefix}_${String(enriched.length).padStart(3, '0')}.md`);
    console.log(`  Index: ${indexPath}\n`);
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
        totalManifestFiles: totalMdFiles,
        createdAt: new Date().toISOString(),
        characters: manifestSummary,
      },
      null,
      2
    )
  );

  productionQueue.activateNextJob(run.id);
  console.log(productionDashboard.renderConsole());
  console.log(`\n✓ Queue jobs: ${allJobs.length}`);
  console.log(`✓ Manifest files: ${totalMdFiles}`);
  console.log(`✓ Summary: ${summaryPath}`);
  console.log('\n💡 Discord: open discord/*.md → copy /imagine → paste');
  console.log('💡 Save MJ downloads to: Downloads\\PickMeTalk_MJ');
  console.log('💡 Watch: npm run mj:production');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => closeProductionDb());

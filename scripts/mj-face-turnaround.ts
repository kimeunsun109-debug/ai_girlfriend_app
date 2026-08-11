#!/usr/bin/env npx tsx
/**
 * 4명 캐릭터 얼굴 턴어라운드(정면·좌·우) Midjourney 명령 생성
 *
 * npm run mj:face-turnaround
 * npm run mj:face-turnaround -- --character=narin
 * npm run mj:face-turnaround -- --submit --character=yuna
 * npm run mj:face-turnaround -- --dry-run
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  FACE_TURNAROUND_CHARACTERS,
  buildFaceTurnaroundJobs,
  buildFaceTurnaroundMjCommand,
  getFaceTurnaroundCharacter,
} from '../src/config/face-turnaround.config.js';
import {
  getCharacterFaceIdentity,
  getCharacterCrefUrl,
} from '../src/config/character-face-reference.config.js';
import { PHOTO_UNIVERSE_DATA_ROOT } from '../src/config/photo-universe.config.js';
import { mjProxyClient, sleep } from '../src/lib/midjourney-production/mj-proxy-client.js';

const OUTPUT_DIR = join(PHOTO_UNIVERSE_DATA_ROOT, 'face-turnaround');
const DISCORD_SAFE_CHARS = 1900;

function fitDiscordCommand(cmd: string): string {
  if (cmd.length <= DISCORD_SAFE_CHARS) return cmd;
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
  const charArg = process.argv.find((a) => a.startsWith('--character='));
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const character = charArg?.split('=')[1];
  const slugs = character
    ? [character]
    : FACE_TURNAROUND_CHARACTERS.map((c) => c.slug);
  return {
    slugs,
    dryRun: process.argv.includes('--dry-run'),
    submit: process.argv.includes('--submit'),
    limit: limitArg ? Number(limitArg.split('=')[1]) : undefined,
  };
}

function ensureProxyConfigured(): void {
  const missing = [
    'MJ_PROXY_TOKEN',
    'MJ_DISCORD_TOKEN',
    'MJ_DISCORD_SERVER_ID',
    'MJ_DISCORD_CHANNEL_ID',
  ].filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(
      `Face turnaround auto-submit requires: ${missing.join(', ')}\nSee docs/MJ_AUTO_GENERATE.md`
    );
  }
}

async function submitFaceTurnaroundJobs(
  jobs: ReturnType<typeof buildFaceTurnaroundJobs>,
  limit?: number
): Promise<void> {
  ensureProxyConfigured();
  const delayMs = Number(process.env.MJ_AUTO_DELAY_MS ?? 120_000);
  const slice = limit && limit > 0 ? jobs.slice(0, limit) : jobs;

  console.log(`\n─── Auto-submit ${slice.length} face turnaround jobs ───\n`);

  for (let i = 0; i < slice.length; i++) {
    const job = slice[i]!;
    const cmd = buildFaceTurnaroundMjCommand(job);
    const cref = getCharacterCrefUrl(job.character);
    if (!cref) {
      console.warn(`⚠ ${job.character}: MJ_CREF_${job.character.toUpperCase()} not set — face may drift`);
    }
    console.log(`[${i + 1}/${slice.length}] ${job.id}`);
    const result = await mjProxyClient.imagine({ prompt: cmd });
    console.log(`  → jobId: ${result.jobId} (${result.status})`);
    if (i < slice.length - 1) {
      console.log(`  waiting ${delayMs / 1000}s…`);
      await sleep(delayMs);
    }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  PickMeTalk Face Turnaround MJ Generator ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const { slugs, dryRun, submit, limit } = parseArgs();
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const jobs = buildFaceTurnaroundJobs(slugs);
  const byCharacter: Record<string, typeof jobs> = {};

  for (const job of jobs) {
    if (!byCharacter[job.character]) byCharacter[job.character] = [];
    byCharacter[job.character]!.push(job);
  }

  const summary: Array<{
    character: string;
    name: string;
    jobCount: number;
    crefConfigured: boolean;
    localReferencePath: string;
    outputDir: string;
  }> = [];

  for (const slug of slugs) {
    const charJobs = byCharacter[slug] ?? [];
    const meta = getFaceTurnaroundCharacter(slug);
    const identity = getCharacterFaceIdentity(slug);
    if (!meta || !identity || charJobs.length === 0) {
      console.warn(`⚠ Skipping unknown or empty character: ${slug}`);
      continue;
    }

    const charDir = join(OUTPUT_DIR, slug);
    const discordDir = join(charDir, 'discord');
    mkdirSync(discordDir, { recursive: true });

    const enriched = charJobs.map((job, i) => {
      const raw = buildFaceTurnaroundMjCommand(job);
      const midjourneyCommand = fitDiscordCommand(raw);
      const index = i + 1;
      const pad = String(index).padStart(2, '0');
      const fileName = `${slug.toUpperCase()}_FACE_${pad}_${job.angle}_v${job.variation}.md`;
      if (!dryRun) {
        writeFileSync(join(discordDir, fileName), `${midjourneyCommand}\n`, 'utf-8');
      }
      return {
        ...job,
        index,
        fileName,
        midjourneyCommand,
        chars: midjourneyCommand.length,
        targetFolder: `face-turnaround/${slug}/${job.angle}`,
      };
    });

    const manifestPath = join(charDir, `${slug}-face-manifest.json`);
    if (!dryRun) {
      writeFileSync(
        manifestPath,
        JSON.stringify(
          {
            character: slug,
            name: identity.name,
            count: enriched.length,
            identityLock: identity.identityPrompt,
            localReferencePath: meta.localReferencePath,
            crefEnvKey: `MJ_CREF_${slug.toUpperCase()}`,
            crefUrl: getCharacterCrefUrl(slug),
            createdAt: new Date().toISOString(),
            jobs: enriched,
          },
          null,
          2
        )
      );
    }

    const md: string[] = [
      `# ${identity.name} (${slug}) — 얼굴 턴어라운드 Midjourney`,
      '',
      '## 요구사항',
      '- 정면 / 오른쪽 / 왼쪽 얼굴',
      '- 얼굴 Identity Lock 유지 (`--cref` 필수)',
      '- 연한 화장 (쌩얼 금지, 과한 화장 금지)',
      '- 자연스러운 실사 인물 사진',
      '',
      '## 로컬 레퍼런스',
      `\`${meta.localReferencePath}\``,
      '',
      '## CREF 설정 (.env)',
      '```env',
      `MJ_CREF_${slug.toUpperCase()}=https://cdn.discordapp.com/attachments/.../face-ref.png`,
      'MJ_CREF_WEIGHT=100',
      '```',
      '',
      '1. 위 로컬 폴더/파일에서 **정면 얼굴** 1장을 Discord에 업로드',
      '2. 이미지 URL을 `MJ_CREF_' + slug.toUpperCase() + '`에 설정',
      '',
      '## Identity Lock',
      '',
      identity.identityPrompt,
      '',
      '| # | 각도 | 변형 | 파일 | Chars |',
      '|---|------|------|------|-------|',
    ];

    for (const j of enriched) {
      md.push(`| ${j.index} | ${j.label.split(' ')[0]} | v${j.variation} | \`${j.fileName}\` | ${j.chars} |`);
    }

    md.push('', '---', '');

    for (const j of enriched) {
      md.push(
        `## ${j.index}. ${j.label}`,
        `**저장:** \`${j.targetFolder}\``,
        '',
        '```',
        j.midjourneyCommand,
        '```',
        ''
      );
    }

    const commandsPath = join(charDir, `${slug.toUpperCase()}_FACE_MJ_COMMANDS.md`);
    if (!dryRun) {
      writeFileSync(commandsPath, md.join('\n'));
    }

    const crefConfigured = Boolean(getCharacterCrefUrl(slug));
    summary.push({
      character: slug,
      name: identity.name,
      jobCount: enriched.length,
      crefConfigured,
      localReferencePath: meta.localReferencePath,
      outputDir: charDir,
    });

    console.log(`✓ ${identity.name} (${slug}): ${enriched.length} prompts`);
    console.log(`  ${commandsPath}`);
    console.log(`  CREF: ${crefConfigured ? 'configured' : '⚠ MJ_CREF_' + slug.toUpperCase() + ' not set'}\n`);
  }

  const allMd: string[] = [
    '# 4명 얼굴 턴어라운드 — Midjourney 전체 가이드',
    '',
    '## 캐릭터',
    '| 캐릭터 | 프롬프트 수 | 로컬 레퍼런스 | CREF |',
    '|--------|------------|--------------|------|',
  ];

  for (const s of summary) {
    allMd.push(
      `| ${s.name} (${s.character}) | ${s.jobCount} | \`${s.localReferencePath}\` | ${s.crefConfigured ? '✓' : '설정 필요'} |`
    );
  }

  allMd.push(
    '',
    '## Windows 자동 생성',
    '',
    '```powershell',
    '# Terminal A — Watch',
    'npm run mj:production',
    '',
    '# Terminal B — 얼굴 턴어라운드 자동 제출 (캐릭터별)',
    'npm run mj:face-turnaround -- --submit --character=narin',
    'npm run mj:face-turnaround -- --submit --character=yuna',
    'npm run mj:face-turnaround -- --submit --character=jiyu',
    'npm run mj:face-turnaround -- --submit --character=yunseo',
    '```',
    '',
    '## 수동 Discord 붙여넣기',
    '',
    '각 캐릭터 `discord/*.md` 파일 내용을 Discord Midjourney 채널에 붙여넣기.',
    '',
    '## 각도별 구성 (캐릭터당 9장)',
    '- 정면 × 3변형',
    '- 오른쪽 × 3변형',
    '- 왼쪽 × 3변형',
    '',
    `생성 시각: ${new Date().toISOString()}`,
    ''
  );

  const summaryPath = join(OUTPUT_DIR, 'FACE_TURNAROUND_GUIDE.md');
  const summaryJsonPath = join(OUTPUT_DIR, 'face-turnaround-summary.json');

  if (!dryRun) {
    writeFileSync(summaryPath, allMd.join('\n'));
    writeFileSync(
      summaryJsonPath,
      JSON.stringify(
        {
          totalJobs: jobs.length,
          characters: summary,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }

  console.log('─────────────────────────────────────────');
  console.log(`Total prompts: ${jobs.length}`);
  console.log(`Guide: ${summaryPath}`);
  console.log(`Summary: ${summaryJsonPath}`);
  console.log('\n💡 CREF 미설정 시 .env에 MJ_CREF_NARIN 등 URL 추가 후 재실행');
  console.log('💡 Discord: discord/*.md → copy /imagine → paste');

  if (submit && !dryRun) {
    await submitFaceTurnaroundJobs(jobs, limit);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

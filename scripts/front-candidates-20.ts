#!/usr/bin/env npx tsx
/**
 * 2026-07-23 — Character front candidate prompts (+20 each × 5)
 *
 * Forces: front-facing, clear face, upper body, soft light, identity lock.
 * Does NOT change character-meet heroPhoto.
 *
 * Usage:
 *   npm run photos:front-candidates
 *   npm run photos:front-candidates -- --character=yuna
 *   npm run photos:front-candidates -- --count=20 --seed=20260723
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { characterImageFactory } from '../src/lib/photo-catalog/image-factory.js';
import type { ImageScenario } from '../src/lib/photo-catalog/image-factory.js';
import { CHARACTER_SPECS } from '../src/data/character-specs.js';

const FRONT_CAMERAS = [
  'iPhone front selfie, face centered, looking at camera',
  'front-facing upper-body portrait, eye level, looking at camera',
  'natural front selfie, clear face, soft focus on eyes',
  'front portrait for profile photo, face fully visible',
] as const;

const FRONT_LIGHTING = [
  'soft natural window light',
  'soft diffused daylight',
  'soft warm indoor ambient light',
  'overcast soft outdoor light',
] as const;

const FRONT_ACTIONS = [
  'taking selfie looking at camera',
  'posing for profile photo',
  'smiling at camera',
  'casual front portrait',
  'holding phone for selfie',
] as const;

const FRONT_EXPRESSIONS = [
  'natural subtle smile',
  'gentle warm smile',
  'soft neutral face looking at camera',
  'smiling eyes',
  'relaxed friendly expression',
] as const;

const FRONT_NEGATIVE_EXTRA = [
  'side profile',
  'back view',
  'looking away',
  'face turned away',
  'hands only',
  'body only without face',
  'face occluded',
  'face covered',
  'extreme close-up crop cutting chin',
  'wide group shot',
  'multiple people',
  'blurry face',
].join(', ');

function parseArgs() {
  const character = process.argv.find((a) => a.startsWith('--character='))?.split('=')[1];
  const count = Number(
    process.argv.find((a) => a.startsWith('--count='))?.split('=')[1] ?? 20
  );
  const seed = Number(
    process.argv.find((a) => a.startsWith('--seed='))?.split('=')[1] ?? 20260723
  );
  return { character, count, seed };
}

function frontScenario(index: number): Partial<ImageScenario> {
  return {
    camera: FRONT_CAMERAS[index % FRONT_CAMERAS.length],
    lighting: FRONT_LIGHTING[index % FRONT_LIGHTING.length],
    action: FRONT_ACTIONS[index % FRONT_ACTIONS.length],
    expression: FRONT_EXPRESSIONS[index % FRONT_EXPRESSIONS.length],
  };
}

function appendFrontLock(prompt: string): string {
  return [
    prompt,
    '',
    '## Front candidate lock (2026-07-23)',
    'FRONT-FACING ONLY — face looking at camera',
    'Clear sharp face, eyes visible, upper body framing',
    'Soft light, suitable for profile / character select / chat avatar',
    'Single person only — unique face for this character DNA',
    'Do NOT generate side, back, hands-only, or occluded-face shots',
  ].join('\n');
}

async function main() {
  const { character, count, seed } = parseArgs();
  const slugs = character
    ? [character]
    : CHARACTER_SPECS.map((c) => c.slug);

  const outRoot = join(process.cwd(), 'data', 'front-candidates-2026-07-23');
  mkdirSync(outRoot, { recursive: true });

  const summary: Array<{ slug: string; count: number; file: string }> = [];

  for (const slug of slugs) {
    const batch = [];
    for (let i = 0; i < count; i++) {
      const item = characterImageFactory.generate(slug, {
        seed: seed + slugs.indexOf(slug) * 1000 + i,
        scenario: frontScenario(i),
      });
      if (!item) {
        console.error(`Unknown character: ${slug}`);
        process.exit(1);
      }
      batch.push({
        ...item,
        index: i + 1,
        suggestedFilename: `${slug}_front_${String(i + 1).padStart(3, '0')}.jpg`,
        prompt: appendFrontLock(item.prompt),
        negativePrompt: `${item.negativePrompt}, ${FRONT_NEGATIVE_EXTRA}`,
      });
    }

    const dir = join(outRoot, slug);
    mkdirSync(dir, { recursive: true });
    const jsonPath = join(dir, `front-${count}.json`);
    writeFileSync(jsonPath, JSON.stringify(batch, null, 2), 'utf-8');

    // Per-file Discord/local paste prompts
    const discordDir = join(dir, 'prompts');
    mkdirSync(discordDir, { recursive: true });
    for (const item of batch) {
      const pad = String(item.index).padStart(3, '0');
      const md = [
        `# ${slug.toUpperCase()} FRONT ${pad}`,
        '',
        `Suggested file: \`${item.suggestedFilename}\``,
        `Seed: ${item.seed}`,
        `DNA: ${item.characterDNA}`,
        '',
        '## PROMPT',
        '',
        '```',
        item.prompt,
        '```',
        '',
        '## NEGATIVE',
        '',
        '```',
        item.negativePrompt,
        '```',
        '',
      ].join('\n');
      writeFileSync(join(discordDir, `${slug.toUpperCase()}_FRONT_${pad}.md`), md, 'utf-8');
    }

    // One-liner paste sheet
    const sheet = batch
      .map(
        (b) =>
          `--- ${b.suggestedFilename} (seed ${b.seed}) ---\n${b.prompt}\n\nNEGATIVE: ${b.negativePrompt}\n`
      )
      .join('\n');
    writeFileSync(join(dir, 'PASTE_SHEET.txt'), sheet, 'utf-8');

    summary.push({ slug, count: batch.length, file: jsonPath });
    console.log(`✓ ${slug}: ${batch.length} front prompts → ${dir}`);
  }

  writeFileSync(
    join(outRoot, 'README.md'),
    [
      '# Front Candidates 2026-07-23',
      '',
      '캐릭터 확정 전 — 5명 × 20장 **정면 후보** 프롬프트.',
      '',
      '## Desktop 정리 목표',
      '',
      '```',
      'C:\\Users\\user\\OneDrive\\Desktop\\픽미톡 ai\\',
      '  yuna\\front\\   yuna_front_001.jpg … 020.jpg',
      '  narin\\front\\',
      '  yunseo\\front\\',
      '  eunha\\front\\',
      '  jiyu\\front\\',
      '```',
      '',
      '## 생성 후',
      '',
      '1. MJ / 로컬 AI로 각 prompts/*.md 생성',
      '2. `scripts/organize-desktop-front.ps1` 로 Desktop `front\\`에 복사·리네임',
      '3. **heroPhoto 확정 금지** — 사용자가 고른 뒤',
      '',
      '## Generated',
      '',
      ...summary.map((s) => `- **${s.slug}**: ${s.count} → \`${s.file}\``),
      '',
      `Seed base: ${seed}`,
      `GeneratedAt: ${new Date().toISOString()}`,
      '',
    ].join('\n')
  );

  writeFileSync(join(outRoot, 'summary.json'), JSON.stringify({ seed, summary, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`\nDone. ${summary.length} characters × ${count} → ${outRoot}`);
  console.log('Next (Windows): .\\scripts\\organize-desktop-front.ps1');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

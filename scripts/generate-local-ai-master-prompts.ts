/**
 * Generate Local AI Master prompt markdown for narin/yunseo/eunha/jiyu.
 * Run: npx tsx scripts/generate-local-ai-master-prompts.ts
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  MASTER_SHOT_SPECS,
  masterShotScenePrompt,
} from '../src/lib/hybrid-factory/master-shot-spec.js';

type CharPack = {
  slug: string;
  nameEn: string;
  nameKo: string;
  identityEn: string;
  negativeExtra: string;
  outfitHint: string;
  vibeHint: string;
};

const packs: CharPack[] = [
  {
    slug: 'narin',
    nameEn: 'Narin',
    nameKo: '나린',
    identityEn:
      'SAME PERSON every photo — Narin, 23 year old Korean woman, slightly cat-like sharp features, defined sharp jawline, sharp clear eyes with cool chic gaze, straight elegant nose bridge, one dimple when smiling brightly, cool-toned bright skin with natural texture, short black bob hair with soft bangs, slim neat body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter',
    negativeExtra:
      'long hair unless specified, round face, cute puppy face, soft gentle neighbor vibe',
    outfitHint: 'polo collar knit top, luxury casual fashion',
    vibeHint: 'tsundere cool girl, confident chic vibe',
  },
  {
    slug: 'yunseo',
    nameEn: 'Yunseo',
    nameKo: '윤서',
    identityEn:
      'SAME PERSON every photo — Yunseo, 24 year old Korean woman, elegant cat-like refined features, sharp neat facial lines, calm composed eyes with long lashes, straight tidy nose, small lips with calm subtle smile, clear bright fair skin, long straight black hair with clean part, slender graceful body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter',
    negativeExtra:
      'short hair unless specified, playful expression, messy hair, childish cute face, loud makeup',
    outfitHint: 'crisp white shirt, refined intellectual outfit',
    vibeHint: 'sophisticated intellectual aura, elegant calm vibe',
  },
  {
    slug: 'eunha',
    nameEn: 'Eunha',
    nameKo: '은하',
    identityEn:
      'SAME PERSON every photo — Eunha, 22 year old Korean woman, free-spirited soft face, rounded jaw, bright curious eyes, small cute nose, wide bright smile when laughing, bright skin with natural freckles or light texture allowed, wavy bob hair with subtle color highlights or soft bridge highlights, petite energetic body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter',
    negativeExtra:
      'long straight black hair, serious expression, corporate look, stiff formal pose, cold chic face',
    outfitHint: 'colorful cozy aesthetic outfit, cafe fashion',
    vibeHint: 'quirky free-spirited Instagram cafe vibe',
  },
  {
    slug: 'jiyu',
    nameEn: 'Jiyu',
    nameKo: '지유',
    identityEn:
      'SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter',
    negativeExtra:
      'formal suit, stiff pose, short bob unless specified, overly glamorous makeup, office lady look',
    outfitHint: 'oversized hoodie or trendy casual streetwear',
    vibeHint: 'trendy relaxed cool girlfriend vibe, playful energy',
  },
];

const SHARED_NEG_BASE =
  'different person, different face, face morph, identity drift, cartoon, anime, illustration, 3d render, cgi, plastic skin, deformed face, asymmetrical eyes, extra fingers, bad anatomy, uncanny valley, western features, heavy makeup, over-smoothed skin, watermark, text, logo';

const ANGLE_KO: Record<string, string> = {
  front: '정면',
  left45: '왼쪽 45°',
  right45: '오른쪽 45°',
  left_profile: '왼쪽 프로필',
  right_profile: '오른쪽 프로필',
};
const EXPR_KO: Record<string, string> = {
  neutral: '무표정',
  smile: '미소',
  laugh: '웃음',
};
const LIGHT_KO: Record<string, string> = { indoor: '실내', outdoor: '야외' };
const HAIR_KO: Record<string, string> = { down: '머리 내림', up: '머리 올림' };
const STYLE_KO: Record<string, string> = {
  casual: '캐주얼',
  daily: '데일리룩',
  natural_selfie: '셀카',
};

function hairOverride(hair: 'down' | 'up', pack: CharPack): string {
  if (hair === 'down') {
    if (pack.slug === 'narin') return 'short black bob hair down with soft bangs';
    if (pack.slug === 'yunseo') return 'long straight black hair down, clean part';
    if (pack.slug === 'eunha') return 'wavy bob hair down with subtle highlights';
    if (pack.slug === 'jiyu') return 'trendy long hair down';
  }
  if (pack.slug === 'narin') return 'short black bob styled neatly, hair tucked behind ears or half-up';
  if (pack.slug === 'yunseo') return 'long black hair in neat low ponytail or bun';
  if (pack.slug === 'eunha') return 'wavy bob half-up or clipped back';
  if (pack.slug === 'jiyu') return 'trendy high or mid ponytail';
  return hair === 'up' ? 'hair up in ponytail or bun' : 'hair down, natural length';
}

function main() {
  const outDir = join(process.cwd(), 'docs', 'local-ai-master-prompts');
  mkdirSync(outDir, { recursive: true });

  const indexLines = [
    '# Local AI Master Dataset Prompts — All Characters',
    '',
    'RTX / ComfyUI / FLUX / SDXL용 Master 16장 프롬프트.',
    '',
    '| Character | File | Inbox path |',
    '|-----------|------|------------|',
    '| Yuna 유나 | [LOCAL_AI_YUNA_MASTER_PROMPTS.md](../LOCAL_AI_YUNA_MASTER_PROMPTS.md) | `D:\\PickMeTalk_PhotoLibrary\\master\\yuna\\_inbox\\` |',
  ];

  for (const pack of packs) {
    const neg = `${SHARED_NEG_BASE}, ${pack.negativeExtra}`;
    const lines: string[] = [];
    lines.push(`# ${pack.nameEn} (${pack.nameKo}) — Local AI Master Dataset Prompts (16)`);
    lines.push('');
    lines.push('RTX / ComfyUI / FLUX / SDXL용. Face Reference(IP-Adapter/PuLID) 권장.');
    lines.push('');
    lines.push('## 사용법');
    lines.push('');
    lines.push('1. M01부터 생성 → 통과 얼굴을 레퍼런스로 고정');
    lines.push('2. Positive / Negative 붙여넣기 · 해상도 **768×1024** (3:4)');
    lines.push(
      `3. 통과 16장 → \`D:\\PickMeTalk_PhotoLibrary\\master\\${pack.slug}\\_inbox\\\``
    );
    lines.push(`4. \`npm run factory:profile -- --character=${pack.slug}\``);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Shared Identity');
    lines.push('');
    lines.push('```');
    lines.push(pack.identityEn);
    lines.push('```');
    lines.push('');
    lines.push('## Shared Negative');
    lines.push('');
    lines.push('```');
    lines.push(neg);
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');

    MASTER_SHOT_SPECS.forEach((spec, i) => {
      const n = String(i + 1).padStart(2, '0');
      const title = `M${n} — ${ANGLE_KO[spec.angle]} · ${EXPR_KO[spec.expression]} · ${LIGHT_KO[spec.lighting]} · ${HAIR_KO[spec.hair]} · ${STYLE_KO[spec.style]}`;
      let sceneAdj = masterShotScenePrompt(spec);
      sceneAdj = sceneAdj
        .replace('hair down, natural length', hairOverride('down', pack))
        .replace('hair up in ponytail or bun', hairOverride('up', pack))
        .replace('casual everyday outfit', pack.outfitHint)
        .replace('daily Korean street style look', `${pack.outfitHint}, ${pack.vibeHint}`);

      const positive = [pack.identityEn, sceneAdj, pack.vibeHint, 'KEEP EXACT SAME FACE'].join(
        ', '
      );

      lines.push(`## ${title}`);
      lines.push('');
      lines.push(`\`${spec.id}\``);
      lines.push('');
      lines.push('**Positive**');
      lines.push('```');
      lines.push(positive);
      lines.push('```');
      lines.push('');
    });

    lines.push('---');
    lines.push('');
    lines.push('## 저장 파일명 예시');
    lines.push('');
    lines.push('```');
    lines.push(
      `${pack.nameEn.toUpperCase()}_MASTER_01.png … ${pack.nameEn.toUpperCase()}_MASTER_16.png`
    );
    lines.push(`→ D:\\PickMeTalk_PhotoLibrary\\master\\${pack.slug}\\_inbox\\`);
    lines.push('```');
    lines.push('');

    const file = `LOCAL_AI_${pack.slug.toUpperCase()}_MASTER_PROMPTS.md`;
    writeFileSync(join(outDir, file), lines.join('\n'));
    indexLines.push(
      `| ${pack.nameEn} ${pack.nameKo} | [${file}](./${file}) | \`D:\\PickMeTalk_PhotoLibrary\\master\\${pack.slug}\\_inbox\\\` |`
    );
    console.log('wrote', file);
  }

  indexLines.push('');
  indexLines.push('## 공통 Negative 베이스');
  indexLines.push('');
  indexLines.push('```');
  indexLines.push(SHARED_NEG_BASE);
  indexLines.push('```');
  indexLines.push('');
  indexLines.push('Yuna 유나도 동일 구조: `docs/LOCAL_AI_YUNA_MASTER_PROMPTS.md`');
  indexLines.push('');
  indexLines.push('재생성:');
  indexLines.push('');
  indexLines.push('```powershell');
  indexLines.push('npx tsx scripts/generate-local-ai-master-prompts.ts');
  indexLines.push('```');
  indexLines.push('');

  writeFileSync(join(outDir, 'README.md'), indexLines.join('\n'));
  console.log('wrote README.md');
}

main();

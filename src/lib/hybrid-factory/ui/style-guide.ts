/**
 * Character Style Guide — auto-maintained living document.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { FACTORY_PATHS } from '../../../config/hybrid-factory.config.js';
import { getCharacterFaceIdentity } from '../../../config/character-face-reference.config.js';
import { listMasterImages, loadMasterIndex } from '../master-dataset.js';
import { loadCharacterProfile } from '../character-profile.js';
import { selectBestProfile, selectProfileCandidates } from './profile-selector.js';

export async function generateStyleGuide(character: string): Promise<string> {
  const identity = getCharacterFaceIdentity(character);
  const profile = loadCharacterProfile(character);
  const master = loadMasterIndex(character);
  const best = await selectBestProfile(character);
  const candidates = await selectProfileCandidates(character, 5);
  const masterCount = listMasterImages(character).length;

  const md = [
    `# Character Style Guide — ${character}`,
    '',
    `> Auto-generated ${new Date().toISOString()} · Hybrid Photo Factory v2`,
    '',
    '## Face Identity (IMMUTABLE basis)',
    '',
    identity?.identityPrompt ?? profile?.faceIdentity.identityPrompt ?? 'n/a',
    '',
    '### Negatives',
    '',
    identity?.identityNegative ?? '',
    '',
    '## Master Dataset',
    '',
    `- Count: **${masterCount}** (target 10–20)`,
    `- Index images: ${master.images.map((i) => i.shotId).join(', ') || 'none'}`,
    '- Rule: **Never modify** registered master files',
    '',
    '## Best Profile',
    '',
    best
      ? `- Path: \`${best.path}\`\n- Confidence: **${best.confidence}%**\n- Stars: ${'★'.repeat(best.stars)}${'☆'.repeat(5 - best.stars)}\n- Reasons: ${best.reasons.join(', ')}`
      : '- Not selected yet',
    '',
    '## Profile Candidates',
    '',
    ...candidates.map(
      (c) => `${c.rank}. (\`${c.source}\`) score ${c.score} — ${c.reasons.join(', ')}`
    ),
    '',
    '## Recommended palette',
    '',
    '- Primary: `#FF8FAB` (PickMeTalk pink)',
    '- Soft bg: `#FFF5F7`',
    '- Ink: `#1a1a1a`',
    '',
    '## Outfit / hair tendencies',
    '',
    '- Casual daily Korean style',
    '- Hair down default; hair up allowed for masters tagged `up`',
    '',
    '## Expression mix (targets)',
    '',
    '- Smile / happy: ~40%',
    '- Neutral: ~30%',
    '- Laugh / excited: ~15%',
    '- Shy / soft: ~15%',
    '',
    '## UI recommended photos',
    '',
    '- Chat list avatar: front smile, high confidence',
    '- Push notification: face-centered crop 96px+',
    '- Album cover: lifestyle shot with clear face',
    '',
    '## Forbidden / reject guidance',
    '',
    '- Face similarity < 90% vs Master',
    '- Blur, heavy AI artifact, duplicate hash',
    '- Occluded face, extreme age/identity drift',
    '',
    '## A/B profile test',
    '',
    best?.ab
      ? `- A: ${best.ab.aLabel} — \`${best.ab.a}\`\n- B: ${best.ab.bLabel} — \`${best.ab.b}\``
      : '- Need ≥2 candidates',
    '',
  ].join('\n');

  const dir = join(FACTORY_PATHS.styleGuides, character);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'STYLE_GUIDE.md');
  writeFileSync(out, md);
  return out;
}

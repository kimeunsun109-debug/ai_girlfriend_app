#!/usr/bin/env npx tsx
/**
 * Midjourney workflow — next prompt + save folder
 *
 * npm run universe:prompt -- yuna cafe
 * npm run universe:prompt -- narin hair shy
 */
import 'dotenv/config';
import {
  prepareMidjourneyPrompt,
  formatMidjourneyWorkflowSteps,
  photoCacheService,
  closeUniverseCatalog,
} from '../src/lib/photo-universe/index.js';
import type { PhotoEmotion } from '../src/lib/photo-catalog/types.js';

async function main() {
  const [character, category, emotion] = process.argv.slice(2);
  if (!character || !category) {
    console.error('Usage: npm run universe:prompt -- <character> <category> [emotion]');
    process.exit(1);
  }

  const lookup = photoCacheService.lookup({
    character,
    location: category,
    emotion: emotion as PhotoEmotion | undefined,
  });

  if (lookup.hit && lookup.photo) {
    console.log('✓ Cache HIT — existing photo in library:\n');
    console.log(JSON.stringify(lookup.photo, null, 2));
    console.log('\nNo new Midjourney generation needed.');
    return;
  }

  const prompt = lookup.suggestedPrompt ?? prepareMidjourneyPrompt({
    characterSlug: character,
    category,
    emotion: emotion as PhotoEmotion | undefined,
  });

  console.log('Cache MISS — generate in Midjourney:\n');
  console.log('─'.repeat(60));
  console.log(prompt.midjourneyCommand);
  console.log('─'.repeat(60));
  console.log(`\nSave to: ${prompt.targetFolder}`);
  console.log(`\n${formatMidjourneyWorkflowSteps(prompt)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => closeUniverseCatalog());

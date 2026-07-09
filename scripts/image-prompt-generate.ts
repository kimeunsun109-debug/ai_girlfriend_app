#!/usr/bin/env npx tsx
/**
 * PickMeTalk Character Image Factory — prompt batch generator
 *
 * Usage:
 *   npm run photos:prompt -- yuna
 *   npm run photos:prompt -- yuna 5
 *   npm run photos:prompt -- --all 3
 *   npm run photos:prompt -- yuna --category hair --emotion shy
 *   npm run photos:prompt -- yuna --seed 42 --json > prompts.json
 */
import { writeFileSync } from 'fs';
import { characterImageFactory } from '../src/lib/photo-catalog/image-factory.js';

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    } else {
      positional.push(a);
    }
  }

  return { flags, positional };
}

async function main() {
  const { flags, positional } = parseArgs(process.argv);
  const json = flags.json === 'true';
  const outFile = flags.out;
  const seed = flags.seed ? parseInt(flags.seed, 10) : undefined;
  const category = flags.category;
  const emotion = flags.emotion;

  const all = flags.all === 'true' || positional[0] === '--all';
  const count = parseInt(positional[1] ?? flags.count ?? '1', 10);

  let characters: string[];
  if (all) {
    characters = characterImageFactory.listCharacters().map((c) => c.slug);
  } else {
    const slug = positional[0];
    if (!slug) {
      console.error('Usage: npm run photos:prompt -- <character| --all> [count] [--category hair] [--json]');
      process.exit(1);
    }
    characters = [slug];
  }

  const results = [];
  for (const slug of characters) {
    const scenarioOverride = category
      ? characterImageFactory.scenarioFromCategory(category, emotion)
      : emotion
        ? { emotion }
        : undefined;

    const batch = characterImageFactory.generateBatch(slug, count, {
      scenario: scenarioOverride,
      seed,
    });

    if (!batch.length) {
      console.error(`Unknown character: ${slug}`);
      process.exit(1);
    }

    results.push(...batch);

    if (!json) {
      for (const item of batch) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`# ${item.character} (${item.slug}) — seed ${item.seed}`);
        console.log(`DNA: ${item.characterDNA}`);
        console.log(`Scenario: ${JSON.stringify(item.scenario)}`);
        console.log(`\n--- PROMPT ---\n${item.prompt}`);
        console.log(`\n--- NEGATIVE ---\n${item.negativePrompt}`);
      }
    }
  }

  if (json) {
    const output = JSON.stringify(results, null, 2);
    if (outFile) {
      writeFileSync(outFile, output, 'utf-8');
      console.error(`Wrote ${results.length} prompts to ${outFile}`);
    } else {
      console.log(output);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

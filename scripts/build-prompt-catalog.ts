#!/usr/bin/env npx tsx
/**
 * Build PickMeTalk Prompt Catalog — assets/prompts/{character}/{category}.json
 *
 * Usage:
 *   npm run prompts:build              # all 5 characters × all categories
 *   npm run prompts:build -- yuna      # one character
 *   npm run prompts:build -- yuna cafe # one category
 *   npm run prompts:verify             # check duplicates & counts
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { promptCatalogBuilder, PROMPTS_ROOT } from '../src/lib/photo-catalog/prompt-catalog-builder.js';
import { PROMPT_CATEGORIES, getPromptCategory } from '../src/config/prompt-categories.config.js';
import { CHARACTER_SPECS } from '../src/data/character-specs.js';
import { resolveCharacterSlug } from '../src/lib/photo-catalog/types.js';

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const cmd = args[0] === 'verify' ? 'verify' : 'build';
  const positional = cmd === 'verify' ? [] : args.filter((a) => !a.startsWith('--'));
  return { cmd, positional };
}

function verify() {
  const issues: string[] = [];
  let totalPrompts = 0;
  const globalSeen = new Map<string, string>();

  for (const spec of CHARACTER_SPECS) {
    const charDir = join(PROMPTS_ROOT, spec.slug);
    if (!existsSync(charDir)) {
      issues.push(`Missing catalog for ${spec.slug}`);
      continue;
    }

    const files = readdirSync(charDir).filter((f) => f.endsWith('.json') && f !== '_index.json');
    let charTotal = 0;

    for (const file of files) {
      const data = JSON.parse(readFileSync(join(charDir, file), 'utf-8'));
      const prompts = data.prompts as Array<{ prompt: string; id: string }>;
      const seen = new Set<string>();

      for (const p of prompts) {
        const norm = p.prompt.replace(/\s+/g, ' ').trim().toLowerCase();
        if (seen.has(norm)) {
          issues.push(`Duplicate in ${spec.slug}/${file}: ${p.id}`);
        }
        seen.add(norm);

        const globalKey = `${spec.slug}:${norm}`;
        if (globalSeen.has(globalKey)) {
          issues.push(`Cross-file duplicate ${spec.slug}/${file}: ${p.id}`);
        }
        globalSeen.set(globalKey, file);
      }

      charTotal += prompts.length;
      const catDef = getPromptCategory(data.category);
      if (catDef && prompts.length < 20) {
        issues.push(`Low count ${spec.slug}/${data.category}: ${prompts.length} (target 20+)`);
      }
    }

    totalPrompts += charTotal;
    if (charTotal < 1000) {
      issues.push(`${spec.slug} total ${charTotal} < 1000 target`);
    }
    console.log(`  ${spec.name} (${spec.slug}): ${files.length} categories, ${charTotal} prompts`);
  }

  console.log(`\nTotal: ${totalPrompts} prompts across ${CHARACTER_SPECS.length} characters`);
  if (issues.length) {
    console.error(`\n${issues.length} issue(s):`);
    for (const i of issues.slice(0, 20)) console.error(`  - ${i}`);
    if (issues.length > 20) console.error(`  ... and ${issues.length - 20} more`);
    process.exit(1);
  }
  console.log('\n✓ Catalog verification passed');
}

async function build(positional: string[]) {
  const capacity = promptCatalogBuilder.getExpectedCapacity();
  console.log(`Building Prompt Catalog`);
  console.log(`  Categories: ${capacity.categories}`);
  console.log(`  Per character: ~${capacity.perCharacter} prompts`);
  console.log(`  All characters: ~${capacity.allCharacters} prompts\n`);

  const charInput = positional[0];
  const catInput = positional[1];

  if (charInput && catInput) {
    const slug = resolveCharacterSlug(charInput);
    const cat = getPromptCategory(catInput);
    if (!slug) {
      console.error(`Unknown character: ${charInput}`);
      process.exit(1);
    }
    if (!cat) {
      console.error(`Unknown category: ${catInput}`);
      process.exit(1);
    }
    const file = promptCatalogBuilder.writeCategoryFile(slug, cat);
    console.log(`Wrote ${slug}/${cat.slug}.json (${file.count} prompts)`);
    return;
  }

  if (charInput) {
    const slug = resolveCharacterSlug(charInput);
    if (!slug) {
      console.error(`Unknown character: ${charInput}`);
      process.exit(1);
    }
    const result = promptCatalogBuilder.buildCharacter(slug);
    console.log(`Built ${result.character}: ${result.totalPrompts} prompts, ${result.categoriesBuilt} categories`);
    return;
  }

  const results = promptCatalogBuilder.buildAll();
  for (const r of results) {
    console.log(`  ${r.character}: ${r.totalPrompts} prompts (${r.duplicatesSkipped} dup skipped)`);
  }
  const total = results.reduce((s, r) => s + r.totalPrompts, 0);
  console.log(`\nDone. ${total} prompts written to assets/prompts/`);
}

async function main() {
  const { cmd, positional } = parseArgs(process.argv);
  if (cmd === 'verify') {
    verify();
  } else {
    await build(positional);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

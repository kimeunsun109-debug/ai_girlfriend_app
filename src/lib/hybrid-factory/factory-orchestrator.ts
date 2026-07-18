/**
 * Hybrid Factory orchestrator — Yuna-first pipeline entrypoints.
 */
import { bootstrapPhotoLibrary, printBootstrapReport } from '../midjourney-production/library-bootstrap.js';
import { join } from 'path';
import { FACTORY_CHARACTERS, FACTORY_PHASE } from '../../config/hybrid-factory.config.js';
import { bootstrapMasterDataset, masterDatasetStats, importInboxToMaster } from './master-dataset.js';
import { buildCharacterProfile } from './character-profile.js';
import { produceLocalBatch, nextScaleTier } from './local-producer.js';
import { renderUiMockups } from './ui/mockup-renderer.js';
import { generateStyleGuide } from './ui/style-guide.js';
import { collectFactoryDashboard, renderFactoryDashboard } from './factory-dashboard.js';
import { getGenerationEngine, listGenerationEngines } from './engines/registry.js';
import { MASTER_SHOT_SPECS } from './master-shot-spec.js';

export async function factoryInit(): Promise<void> {
  const boot = bootstrapPhotoLibrary();
  printBootstrapReport(boot);
  const master = bootstrapMasterDataset();
  console.log('[factory] Master folders:', master);
  console.log(`[factory] Master root : ${join(boot.libraryRoot, 'master')}`);
  console.log(`[factory] Yuna inbox  : ${join(boot.libraryRoot, 'master', 'yuna', '_inbox')}`);
  console.log('[factory] Note: init creates folders only. Images appear after:');
  console.log('  1) Midjourney masters → master/{char}/_inbox');
  console.log('  2) npm run factory:profile');
  console.log('  3) npm run factory:generate  (ACTIVE photos → {char}/{category}/)');
  console.log(renderFactoryDashboard());
  console.log('Engines:', listGenerationEngines());
  const eng = getGenerationEngine();
  console.log(`Active engine: ${eng.id} available=${await eng.isAvailable()}`);
}

export async function factoryBuildProfile(character: string): Promise<void> {
  importInboxToMaster(character);
  const bundle = await buildCharacterProfile(character);
  console.log(
    `[factory] Profile ${character}: masters=${bundle.metadata.masterCount} ready=${bundle.metadata.readyForMassProduction}`
  );
}

export async function factoryGenerate(character: string, count: number): Promise<void> {
  const result = await produceLocalBatch({ character, count });
  console.log('[factory] Produce result:', result);
  console.log(renderFactoryDashboard());
  const next = nextScaleTierHint(character);
  if (next) console.log(`[factory] Next scale tier suggestion: ${next}`);
}

export async function factoryUi(character: string): Promise<void> {
  const mock = await renderUiMockups(character);
  const guide = await generateStyleGuide(character);
  console.log(`[factory] UI mockups: ${mock.outDir}`);
  console.log(`[factory] UI overall score: ${mock.evaluation.overall}`);
  console.log(`[factory] Style guide: ${guide}`);
}

export async function factoryYunaPhase1(options?: {
  generateCount?: number;
  skipGenerate?: boolean;
}): Promise<void> {
  const character = 'yuna';
  await factoryInit();

  const stats = masterDatasetStats([character])[0]!;
  console.log(`\n[factory] Yuna Master: ${stats.count}/${MASTER_SHOT_SPECS.length} (ready≥10: ${stats.ready})`);

  if (stats.count > 0) {
    await factoryBuildProfile(character);
  } else {
    console.log('[factory] Place Midjourney master images in:');
    console.log(`  master/yuna/_inbox/  then re-run factory:profile --character=yuna`);
  }

  if (!options?.skipGenerate && stats.ready) {
    const count = options?.generateCount ?? Math.min(FACTORY_PHASE, 10);
    console.log(`[factory] Local generate count=${count} (use --count=150 on RTX)`);
    await factoryGenerate(character, count);
  }

  if (stats.count > 0) {
    await factoryUi(character);
  }

  console.log('\n' + renderFactoryDashboard(collectFactoryDashboard(['yuna', ...FACTORY_CHARACTERS.filter((c) => c !== 'yuna')])));
  console.log('Yuna-first Hybrid Factory checkpoint complete.');
}

function nextScaleTierHint(_character: string): number | null {
  return nextScaleTier(FACTORY_PHASE);
}

export { MASTER_SHOT_SPECS };

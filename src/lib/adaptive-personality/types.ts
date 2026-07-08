import type { PersonalityTrait } from '@prisma/client';

export interface PersonalityDNAView {
  traitKey: PersonalityTrait;
  label: string;
  coreValue: number;
  adaptiveValue: number;
  delta: number;
}

export interface PersonalitySnapshot {
  userCharacterId: string;
  characterSlug: string;
  stageLevel: number;
  dna: PersonalityDNAView[];
  updatedAt: string;
}

export interface DnaUpdateInput {
  userCharacterId: string;
  sourceType: string;
  reason: string;
  traitDeltas: Partial<Record<PersonalityTrait, number>>;
  maxDelta?: number;
}

export interface AdaptiveContext {
  userCharacterId: string;
  characterSlug: string;
  stageLevel: number;
  affectionScore: number;
  dnaMap: Partial<Record<PersonalityTrait, number>>;
}

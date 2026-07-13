import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import { MJ_PRODUCTION_PATHS } from '../../config/midjourney-production.config.js';
import { getProductionDb } from './production-db.js';

export type ProductionLogLevel = 'info' | 'warn' | 'error';

export interface ProductionLogEvent {
  level: ProductionLogLevel;
  event: string;
  character?: string;
  jobId?: string;
  message: string;
  meta?: Record<string, unknown>;
}

function writeJsonl(entry: Record<string, unknown>): void {
  mkdirSync(dirname(MJ_PRODUCTION_PATHS.eventLog), { recursive: true });
  appendFileSync(MJ_PRODUCTION_PATHS.eventLog, `${JSON.stringify(entry)}\n`);
}

export function logProduction(evt: ProductionLogEvent): void {
  const row = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    ...evt,
  };
  writeJsonl(row);
  try {
    getProductionDb().insertEventLog({
      id: row.id,
      level: evt.level,
      event: evt.event,
      character: evt.character,
      jobId: evt.jobId,
      message: evt.message,
      meta: evt.meta ? JSON.stringify(evt.meta) : undefined,
    });
  } catch {
    /* db may be unavailable in isolated tests */
  }
  const prefix = `[mj-prod:${evt.level}]`;
  const detail = evt.character ? ` ${evt.character}` : '';
  console.log(`${prefix}${detail} ${evt.event}: ${evt.message}`);
}

/**
 * @deprecated `npm run photos:import` 를 사용하세요.
 * 이 스크립트는 하위 호환용 래퍼입니다.
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.warn('⚠️  import-local-photos.ts 는 deprecated 입니다. npm run photos:import 를 사용하세요.\n');

const scriptDir = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', join(scriptDir, 'photos-import.ts'), ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env }
);
process.exit(result.status ?? 1);

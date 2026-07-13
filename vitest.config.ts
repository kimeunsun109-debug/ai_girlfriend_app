import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    env: {
      PICKMETALK_RUNTIME: 'test',
      MJ_PRODUCTION_MODE: 'test',
    },
  },
});

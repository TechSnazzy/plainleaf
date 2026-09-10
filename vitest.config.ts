import { defineConfig, mergeConfig } from 'vitest/config';
import vite from './vite.config.ts';
export default mergeConfig(
  vite,
  defineConfig({
    resolve: { conditions: ['browser'] },
    test: { environment: 'jsdom' },
  }),
);

import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: appRoot,
  resolve: {
    alias: {
      '@': resolve(appRoot),
    },
  },
  test: {
    environment: 'node',
    include: ['app/**/*.test.tsx'],
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});

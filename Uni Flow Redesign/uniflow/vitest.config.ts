import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    // Must run before any src/ module is imported — see the file.
    setupFiles: ['./tests/setup-env.ts'],
    // The ledger suites share one database. Running files in parallel would
    // have them tripping over each other's fiscal years and sequences.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // See tests/server-only-stub.ts for why.
      'server-only': resolve(__dirname, 'tests/server-only-stub.ts'),
    },
  },
});

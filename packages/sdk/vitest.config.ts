import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 120000, // 2 minutes for container startup
    include: ['tests/**/*.test.ts'],
    fileParallelism: false, // Run test files sequentially to share containers
    sequence: {
      hooks: 'stack', // Run hooks in order
    },
  },
});

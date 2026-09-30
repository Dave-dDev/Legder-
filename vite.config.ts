import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    environmentOptions: {
      // happy-dom only provides localStorage once the window has an origin.
      happyDOM: {
        url: 'http://localhost:3000/',
      },
    },
  },
});
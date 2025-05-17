import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/e2e/**/*.e2e-spec.ts', 'test/*.e2e-spec.ts'],
    deps: {
      interopDefault: true,
      optimizer: {
        ssr: {
          include: ['supertest'],
        },
      },
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    // This ensures proper CommonJS module resolution
    conditions: ['node'],
  },
});
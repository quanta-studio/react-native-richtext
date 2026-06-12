import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Resolve workspace packages to their source so tests run without a prior build.
  resolve: {
    alias: {
      '@yk-yong/rn-rich-text-dom': fileURLToPath(
        new URL('./packages/dom/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/index.ts', '**/types.ts'],
    },
  },
})

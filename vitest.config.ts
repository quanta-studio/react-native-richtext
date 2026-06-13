import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@yk-yong/rn-rich-text-dom', replacement: src('./packages/dom/src/index.ts') },
      { find: '@yk-yong/rn-rich-text-css', replacement: src('./packages/css/src/index.ts') },
      { find: '@yk-yong/rn-rich-text-core', replacement: src('./packages/core/src/index.ts') },
      {
        find: /^react-native$/,
        replacement: src('./packages/react-native/test/react-native-mock.tsx'),
      },
    ],
  },
  test: {
    include: ['packages/*/test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['**/index.ts', '**/types.ts', '**/test/**'],
    },
  },
})

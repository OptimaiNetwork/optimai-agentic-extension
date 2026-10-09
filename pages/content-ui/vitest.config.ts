import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const srcDir = resolve(import.meta.dirname, 'src')

export default defineConfig({
  resolve: {
    alias: {
      '@': srcDir,
      '@x': resolve(srcDir, 'matches/x'),
    },
  },
  test: {
    // Pure functions only. Anything needing a browser belongs in tests/e2e,
    // which drives a real Chrome with the real extension loaded.
    include: ['src/**/*.test.ts'],
    // The collector listens on `document`, so it needs a DOM — but nothing here
    // needs a real browser; that is what tests/e2e is for.
    environment: 'happy-dom',
  },
})

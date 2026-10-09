import { withPageConfig } from '@extension/vite-config'
import { resolve } from 'node:path'

const rootDir = resolve(import.meta.dirname)
const srcDir = resolve(rootDir, 'src')

export default withPageConfig({
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  publicDir: resolve(rootDir, 'public'),
  build: {
    outDir: resolve(rootDir, '..', '..', 'dist', 'popup'),
  },
})

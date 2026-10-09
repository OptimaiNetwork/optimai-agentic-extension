import { IS_DEV } from '@extension/env'
import { makeEntryPointPlugin } from '@extension/hmr'
import { getContentScriptEntries, toGlobalName, withPageConfig } from '@extension/vite-config'
import { resolve } from 'node:path'
import { build } from 'vite'

const rootDir = resolve(import.meta.dirname)
const srcDir = resolve(rootDir, 'src')
const matchesDir = resolve(srcDir, 'matches')

const configs = Object.entries(getContentScriptEntries(matchesDir)).map(([name, entry]) =>
  withPageConfig({
    mode: IS_DEV ? 'development' : undefined,
    resolve: {
      alias: {
        '@': srcDir,
      },
    },
    publicDir: resolve(rootDir, 'public'),
    plugins: [IS_DEV && makeEntryPointPlugin()],
    build: {
      lib: {
        name: toGlobalName(name),
        formats: ['iife'],
        entry,
        fileName: name,
      },
      outDir: resolve(rootDir, '..', '..', 'dist', 'content'),
      // Every entry in this package writes to the same directory. Vite clears an
      // outDir by default, so two of them racing leaves only whichever finished
      // last — silently, with a green build.
      emptyOutDir: false,
    },
  })
)

// Sequential, not Promise.all: these share an output directory, so concurrent
// writes are a race whose loser disappears without an error.
for (const config of configs) {
  //@ts-expect-error This is hidden property into vite's resolveConfig()
  config.configFile = false
  await build(config)
}

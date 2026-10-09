import { IS_DEV } from '@extension/env'
import { makeEntryPointPlugin } from '@extension/hmr'
import { getContentScriptEntries, toGlobalName, withPageConfig } from '@extension/vite-config'
import { resolve } from 'node:path'
import { build as buildTW } from 'tailwindcss/lib/cli/build'
import { build, PluginOption } from 'vite'
import svgr from 'vite-plugin-svgr'

const rootDir = resolve(import.meta.dirname)
const srcDir = resolve(rootDir, 'src')
const matchesDir = resolve(srcDir, 'matches')
const xDir = resolve(matchesDir, 'x')

// `CEB_CONTENT_UI_ENTRIES=web` builds only the named entries. Every entry shares
// dist/content-ui, so rebuilding one without the others leaves a running dev
// watcher's bundles alone.
const only = (process.env.CEB_CONTENT_UI_ENTRIES ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)

const entries = Object.entries(getContentScriptEntries(matchesDir)).filter(
  ([name]) => !only.length || only.includes(name)
)

const configs = entries.map(([name, entry]) => ({
  name,
  config: withPageConfig({
    mode: IS_DEV ? 'development' : undefined,
    resolve: {
      alias: {
        '@': srcDir,
        '@x': xDir,
      },
    },
    publicDir: resolve(rootDir, 'public'),
    plugins: [
      IS_DEV && makeEntryPointPlugin(),
      svgr({
        svgrOptions: {
          icon: true,
          prettier: false,
          svgo: false,
          titleProp: true,
          svgoConfig: {
            plugin: [
              {
                name: 'preset-default',
                params: {
                  overrides: {
                    removeViewBox: false,
                  },
                },
              },
            ],
          },
        },
        include: ['**/*.svg?react', '../../packages/**/*.svg?react'],
      }) as PluginOption,
    ],
    build: {
      lib: {
        name: toGlobalName(name),
        formats: ['iife'],
        entry,
        fileName: name,
      },
      outDir: resolve(rootDir, '..', '..', 'dist', 'content-ui'),
      // See the note in pages/content/build.mts: shared outDir, so never clear it.
      emptyOutDir: false,
    },
  }),
}))

const builds = configs.map(async ({ name, config }) => {
  const folder = resolve(matchesDir, name)
  const args = {
    ['--input']: resolve(folder, 'index.css'),
    ['--output']: resolve(rootDir, 'dist', name, 'index.css'),
    ['--config']: resolve(rootDir, 'tailwind.config.ts'),
    ['--watch']: IS_DEV,
  }
  await buildTW(args)
  //@ts-expect-error This is hidden property into vite's resolveConfig()
  config.configFile = false
  await build(config)
})

await Promise.all(builds)

import { resolve } from 'node:path'
import { defineConfig, PluginOption } from 'vite'
import svgr from 'vite-plugin-svgr'
import pkg from './package.json' assert { type: 'json' }

const rootDir = resolve(import.meta.dirname)
const IS_DEV = process.env['CLI_CEB_DEV'] === 'true'
const externalDeps = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  ...Object.keys(pkg.dependencies ?? {}),
  // ...Object.keys(pkg.peerDependencies ?? {}),
]

export const watchOption = IS_DEV
  ? {
      chokidar: {
        awaitWriteFinish: true,
      },
    }
  : undefined

export default defineConfig({
  build: {
    lib: {
      entry: resolve(rootDir, 'index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    outDir: 'dist',
    sourcemap: true,
    // Not emptied first. `turbo watch dev` rebuilds this package while
    // content-ui is already bundling against it, and an emptied dist/ made that
    // bundle fail at random ("Could not resolve ./branding", or `clsx`).
    // `clean:bundle` still wipes it at the start of every `pnpm dev`.
    emptyOutDir: false,
    watch: watchOption,
    rollupOptions: {
      external: externalDeps,
      output: [
        {
          format: 'es',
          preserveModules: true,
          preserveModulesRoot: rootDir,
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
        },
        {
          format: 'cjs',
          preserveModules: true,
          preserveModulesRoot: rootDir,
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[name]-[hash].cjs',
          exports: 'named',
        },
      ],
    },
  },
  plugins: [
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
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
})

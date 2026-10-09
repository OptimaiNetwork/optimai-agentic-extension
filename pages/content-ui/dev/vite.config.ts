import { resolve } from 'node:path'

import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { defineConfig, type PluginOption } from 'vite'
import svgr from 'vite-plugin-svgr'

import baseTailwind from '../tailwind.config'

const devDir = import.meta.dirname
const pageDir = resolve(devDir, '..')
const repoRoot = resolve(pageDir, '..', '..')

/**
 * Where the panel thinks the backend is.
 *
 * Pointed at this dev server rather than straight at `:8787`, so every call is
 * same-origin and the proxy below forwards it. That is not a convenience: the
 * server's `ALLOWED_ORIGINS` is `https://x.com` on purpose — it holds the
 * Binance keys, and widening CORS to whatever origin a developer happens to be
 * serving from is the one change that must not be made casually. A proxy needs
 * no such permission, because the browser only ever sees one origin.
 */
const PORT = 5273
const ORIGIN = `http://localhost:${PORT}`

/** Where the real server listens. `pnpm -C server uv run uvicorn ... --port 8787`. */
const BACKEND = process.env.CATALYST_DEV_BACKEND ?? 'http://localhost:8787'

/**
 * Every prefix the panel's own URL builder can produce: the bare routes, plus
 * the four venue/chain prefixes in `packages/shared/lib/constants/env.ts`
 * (`''`, `/ondo`, `/solana`, `/solana/ondo`). `/solana` covers the last two.
 */
const PROXIED = [
  '/stocks',
  '/catalyst',
  '/agent',
  '/trade',
  '/ondo',
  '/solana',
  '/health',
  // Page highlighting: the lexicon and one card per hovered word (dev/web.html).
  '/lexicon',
  '/hover',
  // Wallet portfolio: recording a trade, and the combined stats and history.
  '/portfolio',
]

export default defineConfig({
  root: devDir,
  // Not `pages/content-ui/dist`: that belongs to the extension build, which
  // deletes and rewrites it. The harness is a dev server and produces nothing.
  cacheDir: resolve(repoRoot, 'node_modules/.vite-panel-dev'),
  resolve: {
    alias: {
      '@x': resolve(pageDir, 'src/matches/x'),
      '@': resolve(pageDir, 'src'),
    },
  },
  /**
   * `@extension/shared` reads this at module scope and it survives into its
   * `dist`, so replacing the expression is enough — no rebuild of the package,
   * and the extension's own value is untouched.
   */
  define: {
    'process.env.CEB_CATALYST_API_URL': JSON.stringify(ORIGIN),
    'process.env': '({})',
  },
  plugins: [
    // Cast for the same reason `build.mts` casts: two copies of vite's types are
    // installed (one per @types/node major), so the plugin's `Plugin` is not the
    // `Plugin` this config's `defineConfig` was typed against.
    svgr({
      svgrOptions: { icon: true, prettier: false, svgo: false, titleProp: true },
      include: '**/*.svg?react',
    }) as PluginOption,
  ],
  css: {
    postcss: {
      plugins: [
        // The page's own globs, made absolute: Tailwind resolves a relative
        // `content` entry against the working directory, and this config is
        // loaded from `dev/`. Derived rather than restated, so the harness
        // cannot end up scanning a different set of files than the build does.
        tailwindcss({
          ...baseTailwind,
          content: (baseTailwind.content as string[]).map((glob) => resolve(pageDir, glob)),
        }),
        autoprefixer(),
      ],
    },
  },
  server: {
    port: PORT,
    strictPort: true,
    fs: {
      // The shim imports the extension's own fetcher, which lives outside this
      // page's folder. Reusing it is the point — see `dev/chrome-shim.ts`.
      allow: [repoRoot],
    },
    proxy: Object.fromEntries(
      PROXIED.map((path) => [path, { target: BACKEND, changeOrigin: true }])
    ),
  },
})

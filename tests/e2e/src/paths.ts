import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export const E2E_ROOT = resolve(here, '..')
export const REPO_ROOT = resolve(E2E_ROOT, '..', '..')

/** Unpacked extension that `pnpm build` writes. */
export const EXTENSION_DIST = resolve(REPO_ROOT, 'dist')

/**
 * Chrome user-data-dir. Everything the browser remembers lives here — cookies,
 * the X session, extension storage — so a login survives across runs.
 */
export const PROFILE_DIR = process.env.CEB_E2E_PROFILE
  ? resolve(process.env.CEB_E2E_PROFILE)
  : resolve(E2E_ROOT, '.chrome-profile')

export const PID_FILE = resolve(process.env.CEB_E2E_PROFILE ? PROFILE_DIR : E2E_ROOT, '.chrome.pid')
export const ENDPOINT_FILE = resolve(
  process.env.CEB_E2E_PROFILE ? PROFILE_DIR : E2E_ROOT,
  '.chrome.endpoint'
)
export const CHROME_LOG = resolve(
  process.env.CEB_E2E_PROFILE ? PROFILE_DIR : E2E_ROOT,
  '.chrome.log'
)

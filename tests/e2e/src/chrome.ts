import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { CHROME_LOG, ENDPOINT_FILE, EXTENSION_DIST, PID_FILE, PROFILE_DIR } from './paths.js'

export const CDP_PORT = Number(process.env.CDP_PORT ?? 9333)

const LAUNCH_TIMEOUT_MS = 45_000
const POLL_INTERVAL_MS = 250

const CHROME_CANDIDATES: Record<string, readonly string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
}

export function resolveChromeBinary(): string {
  const override = process.env.CHROME_PATH
  if (override) {
    if (!existsSync(override)) {
      throw new Error(`CHROME_PATH points at a file that does not exist: ${override}`)
    }
    return override
  }

  const found = (CHROME_CANDIDATES[process.platform] ?? []).find((path) => existsSync(path))
  if (!found) {
    throw new Error(
      `No Chrome found for platform "${process.platform}". Set CHROME_PATH to the binary.`
    )
  }
  return found
}

/**
 * Chrome derives an unpacked extension's id from the absolute path of its
 * folder: first 128 bits of SHA-256, each hex digit mapped 0-f to a-p. Computing
 * it lets a test assert the id Chrome handed back belongs to the bundle that was
 * just built, rather than to some other extension in the profile.
 */
export function expectedExtensionId(distPath: string = EXTENSION_DIST): string {
  const digest = createHash('sha256').update(realpathSync(distPath)).digest('hex').slice(0, 32)
  return [...digest].map((c) => String.fromCharCode(97 + Number.parseInt(c, 16))).join('')
}

const delay = (ms: number) => new Promise((done) => setTimeout(done, ms))

async function waitFor<T>(
  attempt: () => Promise<T | null> | (T | null),
  timeoutMs: number,
  onTimeout: () => string
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const result = await attempt()
    if (result !== null) return result
    if (Date.now() > deadline) throw new Error(onTimeout())
    await delay(POLL_INTERVAL_MS)
  }
}

async function isCdpUp(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}/json/version`, {
      signal: AbortSignal.timeout(2_000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Chrome prints its real endpoint on stderr. Reading it back is the only way to
 * be sure we attach to the browser we started: a fixed port can already be held
 * by some other CDP-enabled browser, and attaching there looks like success
 * while the extension is nowhere to be found.
 */
function readEndpointFromLog(): string | null {
  if (!existsSync(CHROME_LOG)) return null
  const match = /DevTools listening on (ws:\/\/[^\s/]+)\//.exec(readFileSync(CHROME_LOG, 'utf8'))
  const authority = match?.[1]?.replace('ws://', '')
  return authority ? `http://${authority}` : null
}

export function launchChrome(): number {
  if (!existsSync(resolve(EXTENSION_DIST, 'manifest.json'))) {
    throw new Error(`No manifest.json under ${EXTENSION_DIST}. Run \`pnpm build\` first.`)
  }
  mkdirSync(PROFILE_DIR, { recursive: true })
  rmSync(CHROME_LOG, { force: true })

  const child = spawn(
    resolveChromeBinary(),
    [
      `--user-data-dir=${PROFILE_DIR}`,
      `--remote-debugging-port=${CDP_PORT}`,
      // Chrome 137+ ignores --load-extension outright. Unpacked extensions now
      // go in through the CDP Extensions domain, which this flag unlocks.
      '--enable-unsafe-extension-debugging',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-crash-restore-bubble',
      'about:blank',
    ],
    { detached: true, stdio: ['ignore', 'ignore', openSync(CHROME_LOG, 'a')] }
  )
  child.unref()

  if (child.pid === undefined) {
    throw new Error('Chrome did not report a pid')
  }
  writeFileSync(PID_FILE, String(child.pid))
  return child.pid
}

/**
 * Attach to the Chrome owning this profile, starting it if needed.
 * Returns the CDP endpoint of that exact browser.
 */
export async function ensureChrome(): Promise<string> {
  if (existsSync(ENDPOINT_FILE)) {
    const previous = readFileSync(ENDPOINT_FILE, 'utf8').trim()
    if (await isCdpUp(previous)) return previous
  }

  launchChrome()
  const endpoint = await waitFor(
    () => readEndpointFromLog(),
    LAUNCH_TIMEOUT_MS,
    () => `Chrome never announced a DevTools endpoint. See ${CHROME_LOG}.`
  )
  await waitFor(
    async () => ((await isCdpUp(endpoint)) ? true : null),
    LAUNCH_TIMEOUT_MS,
    () => `Chrome announced ${endpoint} but never answered there`
  )

  writeFileSync(ENDPOINT_FILE, endpoint)
  return endpoint
}

export function stopChrome(): number | null {
  rmSync(ENDPOINT_FILE, { force: true })
  if (!existsSync(PID_FILE)) return null

  const pid = Number(readFileSync(PID_FILE, 'utf8').trim())
  rmSync(PID_FILE, { force: true })
  if (!Number.isInteger(pid)) return null

  try {
    process.kill(pid, 'SIGTERM')
    return pid
  } catch {
    return null
  }
}

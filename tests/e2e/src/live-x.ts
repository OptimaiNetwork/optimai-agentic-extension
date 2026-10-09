import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { Locator, Page } from '@playwright/test'

import { E2E_ROOT } from './paths.js'

/**
 * Driving the real x.com without getting the account or the address flagged.
 *
 * Every spec runs against the real site on the signed-in profile, so the rules
 * here are the ones that keep that safe: one shared tab for the whole run, a
 * pause between navigations, a log of every load so the count can be checked,
 * and a hard stop the moment X shows a login wall, a rate limit or a challenge.
 * Nothing here posts, likes, follows or changes a setting; the specs only read.
 */

/** The page most specs share: a cashtag search carries posts, X's price card and SearchTimeline. */
export const X_SEARCH_URL = 'https://x.com/search?q=%24NVDA&f=live'

/** Minimum pause between two loads of x.com, across specs and worker restarts. */
const NAVIGATION_GAP_MS = 6_000

// Outside test-results, which Playwright empties at the start of a run.
const STATE_DIR = resolve(E2E_ROOT, '.x-run')
/** One line per x.com load in this run. Reset by the global setup. */
export const X_LOAD_LOG = resolve(STATE_DIR, 'x-loads.log')
/** Present once X has pushed back. Every later navigation refuses to run. */
export const X_BLOCKED_MARKER = resolve(STATE_DIR, 'x-blocked.txt')

/**
 * Start the load log afresh. The block marker is kept on purpose: once X has
 * pushed back, a new run must not load it again until somebody has checked the
 * account by hand and deleted the marker.
 */
export function resetXRunState(): void {
  mkdirSync(STATE_DIR, { recursive: true })
  rmSync(X_LOAD_LOG, { force: true })
}

const loadsSoFar = (): string[] =>
  existsSync(X_LOAD_LOG) ? readFileSync(X_LOAD_LOG, 'utf8').trim().split('\n').filter(Boolean) : []

const lastLoadAt = (): number => {
  const last = loadsSoFar().at(-1)
  return last ? Number(last.split(' ')[0]) : 0
}

const delay = (ms: number) => new Promise((done) => setTimeout(done, ms))

/** Signs that X wants a human, or wants us gone. Any of them ends the run. */
const BLOCK_URL = /\/(login|i\/flow\/|account\/access)/
const BLOCK_TEXT =
  /rate limit exceeded|unusual activity|verify you are human|your account is (locked|suspended)|something went wrong\. try reloading/i
const CHALLENGE_FRAME = 'iframe[src*="arkoselabs"], iframe[src*="captcha"]'

function refuseIfBlocked(): void {
  if (existsSync(X_BLOCKED_MARKER)) {
    throw new Error(
      `x.com pushed back, so no further page is loaded.\n` +
        readFileSync(X_BLOCKED_MARKER, 'utf8') +
        `Check the account by hand in a normal browser, then delete ${X_BLOCKED_MARKER}.`
    )
  }
}

/** Fail the run, and every spec after it, if X is showing anything but its app. */
export async function assertXUsable(page: Page): Promise<void> {
  // The column or a reason it is missing, whichever comes first.
  await page
    .locator(`[data-testid="primaryColumn"], ${CHALLENGE_FRAME}`)
    .first()
    .waitFor({ timeout: 30_000 })
    .catch(() => undefined)

  const url = page.url()
  const text = await page
    .locator('body')
    .innerText()
    .catch(() => '')
  const challenged = (await page.locator(CHALLENGE_FRAME).count()) > 0
  const columnShown = (await page.locator('[data-testid="primaryColumn"]').count()) > 0
  const reason = BLOCK_URL.test(new URL(url).pathname)
    ? `redirected to ${url}`
    : challenged
      ? 'a challenge frame is on the page'
      : BLOCK_TEXT.exec(text)?.[0]
        ? `the page says "${BLOCK_TEXT.exec(text)![0]}"`
        : !columnShown
          ? 'the timeline column never appeared'
          : null
  if (!reason) return

  writeFileSync(X_BLOCKED_MARKER, `${new Date().toISOString()} ${reason}\n`)
  throw new Error(
    `x.com is not usable (${reason}). The run stops here: do not retry. Check the ` +
      `account by hand in a normal browser, then delete ${X_BLOCKED_MARKER}.`
  )
}

/**
 * Load an x.com URL, at most once every few seconds, and only while X has not
 * pushed back. Every load is logged so a run can report how many it made.
 */
export async function gotoX(page: Page, url: string): Promise<void> {
  refuseIfBlocked()
  // A tab already on X may be showing a challenge that appeared mid-spec.
  // Loading again on top of it is exactly what must not happen.
  if (/^https:\/\/(www\.)?x\.com\//.test(page.url())) await assertXUsable(page)
  const wait = lastLoadAt() + NAVIGATION_GAP_MS - Date.now()
  if (wait > 0) await delay(wait)
  mkdirSync(STATE_DIR, { recursive: true })
  appendFileSync(X_LOAD_LOG, `${Date.now()} ${url}\n`)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await assertXUsable(page)
}

/** Reload counts as a load, and is throttled and checked like one. */
export async function reloadX(page: Page): Promise<void> {
  await gotoX(page, page.url())
}

/**
 * Recorded from the first script of every document on the shared tab: the
 * envelopes the MAIN-world hook hands across, and nothing else.
 */
export const RECORD_X_RESPONSES = `
  window.__catalystSeen = [];
  document.addEventListener('catalyst:x-response', (event) => {
    try {
      const envelope = JSON.parse(event.detail);
      window.__catalystSeen.push({ operation: envelope.operation, status: envelope.status });
    } catch {}
  });
`

export const seenXResponses = (page: Page) =>
  page.evaluate(
    () =>
      (window as never as { __catalystSeen?: Array<{ operation: string; status: number }> })
        .__catalystSeen ?? []
  )

/** Open the panel on a ticker the way a pill does: the event is the whole contract. */
export async function openPanel(page: Page, ticker: string): Promise<Locator> {
  await page.evaluate(
    (detail) => document.dispatchEvent(new CustomEvent('catalyst:open', { detail })),
    { ticker }
  )
  const panel = page.locator('#catalyst-extension-container')
  await panel.waitFor({ state: 'attached' })
  return panel
}

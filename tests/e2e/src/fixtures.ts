import {
  test as base,
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test'
import { ensureChrome } from './chrome.js'
import { ensureExtensionLoaded, reloadExtension } from './extension.js'
import { newBackgroundPage } from './background-page.js'
import { gotoX, RECORD_X_RESPONSES, X_SEARCH_URL } from './live-x.js'

/** What the shared x.com tab heard Chrome refuse, from the moment it opened. */
export interface XTab {
  page: Page
  refusals: string[]
}

type WorkerFixtures = {
  cdpEndpoint: string
  cdpBrowser: Browser
  extensionId: string
  freshExtension: void
  xTab: XTab
}

/** No test-scoped fixtures of our own — everything here is worker-scoped. */
type TestFixtures = NonNullable<unknown>

export const test = base.extend<TestFixtures, WorkerFixtures>({
  cdpEndpoint: [
    async ({}, use) => {
      await use(await ensureChrome())
    },
    { scope: 'worker' },
  ],

  cdpBrowser: [
    async ({ cdpEndpoint }, use) => {
      const browser = await chromium.connectOverCDP(cdpEndpoint)
      await use(browser)
      // Detaches the CDP session only. Chrome stays up so the profile — and any
      // X login in it — survives for the next run.
      await browser.close()
    },
    { scope: 'worker' },
  ],

  extensionId: [
    async ({ cdpBrowser }, use) => {
      await use(await ensureExtensionLoaded(cdpBrowser))
    },
    { scope: 'worker' },
  ],

  // Chrome's own default context, not a fresh incognito one: that is what makes
  // the persistent profile visible to the test.
  context: async ({ cdpBrowser, extensionId }, use) => {
    void extensionId // installing the extension must happen before any page opens
    const [context] = cdpBrowser.contexts()
    if (!context) {
      throw new Error('CDP connection exposed no browser context')
    }
    await use(context as BrowserContext)
  },

  // Chrome keeps a long-running profile between runs, and loadUnpacked is
  // rejected for an extension it already has — so without this a rebuild can
  // leave the previous bundle live and the suite tests code that is no longer
  // on disk.
  freshExtension: [
    async ({ cdpBrowser, extensionId }, use) => {
      const [context] = cdpBrowser.contexts()
      if (context) {
        if (!(await reloadExtension(context as BrowserContext, extensionId))) {
          console.warn(
            `[e2e] the service worker of ${extensionId} is not running, so it was not ` +
              'reloaded. If Chrome was already up before this build, the previous bundle may still be live.'
          )
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000))
      }
      await use()
    },
    { scope: 'worker', auto: true },
  ],

  // One real x.com tab for the whole worker, loaded once on a cashtag search.
  // Each load of the real site from an automated browser is a risk to the
  // account and the address, so specs share this tab instead of opening their
  // own. It is only reloaded when a spec is about surviving a reload.
  xTab: [
    async ({ cdpBrowser, freshExtension }, use) => {
      // The reloaded bundle has to be the one that injects into this tab.
      void freshExtension
      const [context] = cdpBrowser.contexts()
      if (!context) throw new Error('CDP connection exposed no browser context')
      const page = await newBackgroundPage(context as BrowserContext)
      await page.addInitScript(RECORD_X_RESPONSES)
      const refusals: string[] = []
      page.on('console', (message) => {
        if (
          message.type() === 'error' &&
          /address space|Private Network|loopback|Failed to fetch|ERR_FAILED/i.test(message.text())
        ) {
          refusals.push(message.text().slice(0, 200))
        }
      })
      await gotoX(page, X_SEARCH_URL)
      await use({ page, refusals })
      await page.close()
    },
    { scope: 'worker' },
  ],

  // Background, not foreground: this drives the developer's own Chrome, and a
  // new tab raises the window in front of whatever they are doing.
  page: async ({ context }, use) => {
    const page = await newBackgroundPage(context)
    await use(page)
    await page.close()
  },
})

export { expect } from '@playwright/test'

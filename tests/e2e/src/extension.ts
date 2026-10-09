import type { Browser, BrowserContext } from '@playwright/test'
import { expectedExtensionId } from './chrome.js'
import { EXTENSION_DIST } from './paths.js'

type LoadUnpackedResult = { readonly id: string }

/**
 * Install the freshly built bundle into the attached browser.
 *
 * Chrome 137+ ignores the --load-extension command-line switch, so the unpacked
 * extension is handed over through the CDP Extensions domain instead. That needs
 * Chrome to have been started with --enable-unsafe-extension-debugging.
 *
 * On a persistent profile the extension survives restarts, and a second
 * loadUnpacked for the same path is rejected — that rejection means "already
 * installed", so the deterministic path-derived id is used instead.
 */
export async function ensureExtensionLoaded(browser: Browser): Promise<string> {
  const session = await browser.newBrowserCDPSession()
  try {
    const result = (await session.send('Extensions.loadUnpacked', {
      path: EXTENSION_DIST,
    } as never)) as LoadUnpackedResult
    return result.id
  } catch {
    return expectedExtensionId()
  } finally {
    await session.detach().catch(() => undefined)
  }
}

/**
 * Make sure the code running is the code just built.
 *
 * `Extensions.loadUnpacked` is rejected once the extension is installed, and the
 * rejection is indistinguishable from any other — so a rebuild could leave the
 * *previous* bundle live in a long-running Chrome. That is not hypothetical: a
 * run against the real x.com failed with a request the current bundle no longer
 * makes, from a build that had already been replaced on disk.
 *
 * Reloading the service worker re-reads the manifest and every script with it.
 */
export async function reloadExtension(
  context: BrowserContext,
  extensionId: string
): Promise<boolean> {
  // Ours by id: the profile carries other extensions (a wallet among them),
  // and reloading whichever worker happens to be listed first is not this.
  for (const worker of context.serviceWorkers()) {
    if (!worker.url().startsWith(`chrome-extension://${extensionId}/`)) continue
    try {
      // Evaluated inside the extension service worker, where `chrome` exists;
      // this file is type-checked without the extension type definitions.
      await worker.evaluate('chrome.runtime.reload()')
      return true
    } catch {
      // Reloading kills the worker mid-call, so a rejection here is the
      // expected outcome rather than a failure.
      return true
    }
  }
  return false
}

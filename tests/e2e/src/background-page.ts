import type { BrowserContext, Page } from '@playwright/test'

/**
 * Open a tab without taking the screen.
 *
 * `context.newPage()` creates a foreground tab, and Chrome raises the window to
 * show it. This suite drives the developer's own long-running Chrome, so every
 * spec was yanking the window in front of whatever they were doing — a dozen
 * times a run.
 *
 * CDP's `Target.createTarget` takes a `background` flag that Playwright does not
 * expose. The tab is created directly, then matched back to the Playwright
 * `Page` that appears for it.
 */
export async function newBackgroundPage(context: BrowserContext): Promise<Page> {
  const before = new Set(context.pages())
  const session = await context.newCDPSession(await blankAnchor(context, before))

  try {
    await session.send('Target.createTarget', {
      url: 'about:blank',
      background: true,
    } as never)
  } finally {
    await session.detach().catch(() => undefined)
  }

  // Playwright surfaces the new target as a Page shortly after CDP creates it.
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const fresh = context.pages().find((page) => !before.has(page))
    if (fresh) return fresh
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  // Never leave a spec without a page; a foreground tab beats a failed run.
  return context.newPage()
}

/**
 * `newCDPSession` needs a page to attach to, and the browser-level session is
 * not exposed on a context. Any existing page will do; one is created if the
 * context happens to have none, and that one is the only foreground tab this
 * helper can cause.
 */
async function blankAnchor(context: BrowserContext, before: Set<Page>): Promise<Page> {
  const existing = context.pages()[0]
  if (existing) return existing
  const created = await context.newPage()
  before.add(created)
  return created
}

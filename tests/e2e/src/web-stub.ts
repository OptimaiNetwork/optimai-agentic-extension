import type { BrowserContext, Page } from '@playwright/test'

/**
 * A news article served in place of a real site.
 *
 * Content scripts match on the URL, not on who answered it, so this page gets
 * the page-highlighting script exactly as a real article on that host would —
 * without the suite depending on somebody else's markup or uptime.
 *
 * The copy carries every case the scanner has a rule for: a name, a ticker in
 * brackets after an exchange, a cashtag, an issuer's symbol, a ticker that is
 * also an English word used as the word, and the same words inside places that
 * must never be touched.
 */
export const ARTICLE_URL = 'https://news.catalyst-e2e.example/markets/chipmakers'

const ARTICLE = `<!doctype html>
<html lang="en">
  <head><title>Chipmakers rally — stubbed for e2e</title></head>
  <body style="background:#fff;color:#111;font:17px/1.6 Georgia,serif;max-width:720px;margin:40px auto">
    <article>
      <h1>Chipmakers rally as NVIDIA guides higher</h1>
      <p id="lede">NVIDIA (NASDAQ: NVDA) rose after the bell, and Tesla shares followed.
        Traders holding $TSLA and the NVDAon token on Solana watched the tape.</p>
      <p id="word">TURN ON THE LIGHTS: the word ON in capitals is not onsemi.</p>
      <p id="bracket">onsemi (ON) was flat.</p>
      <pre id="code">const ticker = "NVDA" // Tesla</pre>
      <textarea id="field">NVIDIA in a form field</textarea>
      <p id="later"></p>
    </article>
  </body>
</html>`

export async function stubArticle(page: Page): Promise<void> {
  await page.route(`${ARTICLE_URL}*`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: ARTICLE })
  )
}

/** Forget any lexicon a previous run stored, so the page reads the canned one. */
export async function clearStoredLexicon(
  context: BrowserContext,
  extensionId: string
): Promise<void> {
  const worker = context
    .serviceWorkers()
    .find((candidate) => candidate.url().startsWith(`chrome-extension://${extensionId}/`))
  if (!worker) throw new Error('The extension service worker is not running')
  await worker.evaluate("chrome.storage.local.remove('catalyst-lexicon-v1')")
}

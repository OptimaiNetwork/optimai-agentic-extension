import type { Page } from '@playwright/test'

import { backendJson, parseUsd, relativeGap } from '../src/backend.js'
import { newBackgroundPage } from '../src/background-page.js'
import { expect, test } from '../src/fixtures.js'
import { ARTICLE_URL, clearStoredLexicon, stubArticle } from '../src/web-stub.js'

/** Each badge on the page as [kind, ticker]. */
const badges = (page: Page, scope = 'article') =>
  page
    .locator(`${scope} catalyst-badge`)
    .evaluateAll((nodes) =>
      nodes.map((node) => [
        (node as HTMLElement).dataset.kind,
        (node as HTMLElement).dataset.ticker,
      ])
    )

/** The hover card names its listing as "Company · Issuer · Chain". */
const LISTING_LINE = /^(.+) · (bStocks|Ondo|PreStocks) · (BNB Chain|Solana)$/m
const CHAIN_IDS: Record<string, string> = { 'BNB Chain': 'bnb', Solana: 'solana' }
const VENUE_IDS: Record<string, string> = { bStocks: 'bstock', Ondo: 'ondo', PreStocks: 'prestock' }
const PRICE_DRIFT = 0.005

test.describe('badging tokenized stocks on a page that is not X', () => {
  // Every spec here reads the same article, so it gets one tab of its own,
  // opened once and closed once. The article is served locally; nothing on it
  // is X.
  let article: Page

  test.beforeAll(async ({ cdpBrowser, extensionId }) => {
    // Hooks that run once get worker fixtures only, so the context comes from
    // the CDP connection: Chrome's own default one, as everywhere else.
    const [context] = cdpBrowser.contexts()
    if (!context) throw new Error('CDP connection exposed no browser context')
    // Forget the lexicon a previous run stored, so this run fetches the
    // server's current one.
    await clearStoredLexicon(context, extensionId)
    article = await newBackgroundPage(context)
    await stubArticle(article)
    await article.goto(ARTICLE_URL)
    await expect(article.locator('#catalyst-web-host')).toHaveAttribute('data-scan-done', 'true', {
      timeout: 30_000,
    })
  })

  test.afterAll(async () => {
    await article?.close()
  })

  test('one badge after the first mention of each company, ticker and symbol', async () => {
    // Assert: the headline's NVIDIA takes the company badge, so the lede's
    // does not. The live lexicon names onsemi too, and the article does say
    // "onsemi", so that one earns a company badge.
    expect(await badges(article)).toEqual([
      ['company', 'NVDA'],
      ['ticker', 'NVDA'],
      ['company', 'TSLA'],
      ['ticker', 'TSLA'],
      ['symbol', 'NVDA'],
      ['company', 'ON'],
      ['ticker', 'ON'],
    ])
    await expect(
      article.locator('#lede catalyst-badge[data-kind="company"][data-ticker="NVDA"]')
    ).toHaveCount(0)
    // "ON" the capitalised word stays a word; "(ON)" is the ticker.
    await expect(article.locator('#word catalyst-badge[data-kind="ticker"]')).toHaveCount(0)
    await expect(article.locator('#bracket catalyst-badge[data-kind="ticker"]')).toHaveCount(1)
    // Code and form fields are never touched.
    await expect(article.locator('#code catalyst-badge, #field catalyst-badge')).toHaveCount(0)
    await expect(article.locator('#code')).toHaveText('const ticker = "NVDA" // Tesla')
    // A badge adds no text to the page's own copy: its pill lives in the
    // badge's shadow root, which the page's textContent does not include.
    expect(
      await article.locator('#lede').evaluate((node) => node.textContent?.replace(/\s+/g, ' '))
    ).toContain('NVIDIA (NASDAQ: NVDA) rose after the bell, and Tesla shares followed.')
    // The pill shows the mention's token, drawn in the badge's own shadow root.
    await expect(
      article.locator('#lede catalyst-badge[data-kind="symbol"] .catalyst-tweet-market-symbol')
    ).toHaveText('NVDAon')

    // Content the page adds later is scanned too, and a kind already badged stays silent.
    await article.locator('#later').evaluate((node) => {
      node.textContent = 'Late update: Tesla extended gains as NVDAB holders bought.'
    })
    await expect(article.locator('#later catalyst-badge')).toHaveCount(1, { timeout: 5_000 })
    expect(await badges(article, '#later')).toEqual([['symbol', 'NVDA']])
  })

  test('hovering a badge opens its card with the server’s price, View token and Trade, and no Ask', async () => {
    const badge = article.locator('#lede catalyst-badge[data-kind="ticker"][data-ticker="NVDA"]')

    // Act
    await badge.hover()

    // Assert: the card, drawn inside our shadow root, not in the page.
    const card = article.locator('#catalyst-web-host .catalyst-tweet-market-popover')
    await expect(card).toBeVisible({ timeout: 30_000 })
    await expect(card).toContainText('Price per share')
    const text = await card.innerText()
    const listing = LISTING_LINE.exec(text)
    expect(listing, `no listing line in the card: ${text}`).not.toBeNull()
    expect(listing![1]).toBe('NVIDIA')

    // The card's price is the one the server gives for the listing it names.
    const hover = await backendJson<{
      token: { symbol: string }
      quote: { reference_price: string }
    }>(`/hover/NVDA?chain=${CHAIN_IDS[listing![3]!]}&venue=${VENUE_IDS[listing![2]!]}`)
    expect(hover).not.toBeNull()
    await expect(card).toContainText(hover!.token.symbol)
    const cardPrice = parseUsd(text.slice(text.indexOf('Price per share')))
    expect(relativeGap(cardPrice, Number(hover!.quote.reference_price))).toBeLessThan(PRICE_DRIFT)
    // The pill on the badge carries the same figure as the card it opens.
    const pillPrice = parseUsd(await badge.locator('.catalyst-tweet-market-price').innerText())
    expect(relativeGap(pillPrice, cardPrice)).toBeLessThan(PRICE_DRIFT)

    await expect(card.locator('.catalyst-ticker-popover-chart canvas').first()).toBeAttached()
    const trade = card.locator('[data-action="trade"]')
    await expect(trade).toHaveText('Trade now')
    await expect(card.locator('[data-action="view"]')).toHaveText('View token')
    await expect(card.locator('[data-action="ask"]')).toHaveCount(0)

    // Leaving the badge and the card closes it.
    await article.mouse.move(5, 5)
    await expect(card).toHaveCount(0, { timeout: 5_000 })

    // Pressing the pill opens the trade panel, and does not follow any link.
    await badge.locator('.catalyst-tweet-market-pill').click()
    await expect(
      article.locator('#catalyst-web-host [role="dialog"][aria-label^="Trade"]')
    ).toBeVisible()
    expect(article.url()).toBe(ARTICLE_URL)
  })

  test('does not run on X, which has its own injection', async ({ xTab }) => {
    await expect(xTab.page.locator('#catalyst-extension-root')).toBeAttached()
    await expect(xTab.page.locator('#catalyst-web-host')).toHaveCount(0)
  })
})

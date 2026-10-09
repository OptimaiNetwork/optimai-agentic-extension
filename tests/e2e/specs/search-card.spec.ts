import { liveQuote, parseUsd, relativeGap, resolvesOn, selectedListing } from '../src/backend.js'
import { newBackgroundPage } from '../src/background-page.js'
import { expect, test } from '../src/fixtures.js'
import { gotoX } from '../src/live-x.js'

/** A cashtag no issuer lists. Checked against the server before it is used. */
const UNLISTED = 'ZZZZ'

/** How far the card's price may sit from a read taken a moment later. */
const PRICE_DRIFT = 0.005

test.describe('the card on a real cashtag search page', () => {
  test('prices the token and sits clear of X’s own card', async ({ xTab }) => {
    // Arrange: the shared tab is already on the $NVDA search.
    const { page } = xTab
    const panel = page.locator('#catalyst-extension-container')
    const listing = await selectedListing(panel)
    const quote = await liveQuote(listing, 'NVDA')
    expect(quote).not.toBeNull()

    // Assert: the container proves the anchor was found; the class is on what
    // the component renders, which is null when the quote errored. Asserting the
    // container alone is how a card that mounted empty used to pass.
    await expect(page.locator('#catalyst-search-card')).toBeAttached({ timeout: 30_000 })
    const card = page.locator('.catalyst-search-card')
    await expect(card).toBeAttached({ timeout: 30_000 })
    await expect(card).toContainText(quote!.symbol)
    await expect(card).toContainText('per share, multiplier applied')

    // The price on the card is the reference price, within polling drift.
    const price = parseUsd(
      await card
        .getByText(/^\$[\d,]+\.\d{2}$/)
        .first()
        .innerText({ timeout: 30_000 })
    )
    expect(relativeGap(price, Number(quote!.reference_price))).toBeLessThan(PRICE_DRIFT)

    // The chart, drawn rather than merely intended.
    await expect(card.locator('.catalyst-chart canvas').first()).toBeAttached({ timeout: 30_000 })
    expect((await card.locator('.catalyst-chart').boundingBox())!.height).toBeGreaterThan(120)

    // X's timeline is virtualised: a card placed inside it is positioned by a
    // transform we do not control, which once drew ours on top of X's own.
    const geometry = await page.evaluate(() => {
      const ours = document.querySelector('#catalyst-search-card')
      const cells = Array.from(document.querySelectorAll('[data-testid="cellInnerDiv"]'))
      const xCard = cells.find((cell) => !cell.querySelector('article'))
      if (!ours || !xCard) return null
      const a = ours.getBoundingClientRect()
      const b = xCard.getBoundingClientRect()
      return {
        overlaps: a.top < b.bottom && a.bottom > b.top,
        oursBottom: Math.round(a.bottom),
        xCardTop: Math.round(b.top),
        insideTheList: Boolean(xCard.parentElement?.contains(ours)),
      }
    })
    expect(geometry, 'could not find both cards').not.toBeNull()
    expect(geometry!.overlaps, `drawn on top of X's card: ${JSON.stringify(geometry)}`).toBe(false)
    expect(geometry!.insideTheList).toBe(false)
    expect(geometry!.oursBottom).toBeLessThanOrEqual(geometry!.xCardTop + 1)
  })

  test('offers the trade beside the ask, and lands on the buy screen', async ({ xTab }) => {
    const { page } = xTab
    const card = page.locator('.catalyst-search-card')
    await expect(card).toBeAttached({ timeout: 30_000 })

    const ask = card.locator('.catalyst-search-card-cta').first()
    const trade = card.locator('.catalyst-search-card-cta-trade')
    await expect(trade).toBeEnabled({ timeout: 30_000 })

    // Side by side, an even half each, and inside the card.
    const [askBox, tradeBox, cardBox] = await Promise.all([
      ask.boundingBox(),
      trade.boundingBox(),
      card.boundingBox(),
    ])
    expect(Math.round(askBox!.y)).toBe(Math.round(tradeBox!.y))
    expect(Math.abs(askBox!.width - tradeBox!.width)).toBeLessThanOrEqual(1)
    expect(tradeBox!.x).toBeGreaterThan(askBox!.x + askBox!.width - 1)
    expect(tradeBox!.x + tradeBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1)

    // The other door: the purchase for the same token. Nothing is signed here;
    // the spec stops at the empty form.
    await trade.click()
    const panel = page.locator('#catalyst-extension-container')
    await expect(panel).toHaveAttribute('data-open', 'true', { timeout: 10_000 })
    await expect(panel).toContainText('You pay', { timeout: 30_000 })
    await expect(panel).toContainText('You receive')
  })

  test('says nothing on a search for a cashtag no issuer lists', async ({ xTab, context }) => {
    const listing = await selectedListing(xTab.page.locator('#catalyst-extension-container'))
    expect(await resolvesOn(listing, UNLISTED), `${UNLISTED} became listable`).toBe(false)

    // The one spec that needs a second x.com page. Opened here, closed here.
    const page = await newBackgroundPage(context)
    try {
      await gotoX(page, `https://x.com/search?q=%24${UNLISTED}&f=live`)
      await expect(page.locator('#catalyst-extension-container')).toBeAttached()
      // Long enough for the resolve to come back and the card to have mounted
      // if it was going to; the card on $NVDA appears well inside this.
      await page.waitForTimeout(6_000)
      await expect(page.locator('#catalyst-search-card')).toHaveCount(0)
    } finally {
      await page.close()
    }
  })
})

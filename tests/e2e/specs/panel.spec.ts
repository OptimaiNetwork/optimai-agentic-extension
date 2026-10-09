import { backendJson, liveQuote, parseUsd, relativeGap, selectedListing } from '../src/backend.js'
import { expect, test } from '../src/fixtures.js'
import { openPanel } from '../src/live-x.js'

/** How far the panel's price may sit from a read taken a moment later. */
const PRICE_DRIFT = 0.005

test.describe('the token screen', () => {
  test('shows the multiplier corrected price, consistent with its own gap and the server', async ({
    xTab,
  }) => {
    // Arrange: the listing the panel is reading, and the server's own quote for it.
    const panel = await openPanel(xTab.page, 'NVDA')
    await expect(panel).toHaveAttribute('data-open', 'true')
    const listing = await selectedListing(panel)
    const quote = await liveQuote(listing, 'NVDA')
    expect(quote, `NVDA does not resolve on ${listing.issuer} on ${listing.chain}`).not.toBeNull()

    // The server's own arithmetic: reference = token / multiplier. This is the
    // number the whole product is about, so the suite checks it at the source.
    if (quote!.divergence) {
      const token = Number(quote!.divergence.token_price)
      const expected = token / Number(quote!.multiplier)
      expect(relativeGap(Number(quote!.reference_price), expected)).toBeLessThan(1e-6)
    }

    // Assert: the header names the token the server named.
    await expect(panel).toContainText(quote!.symbol, { timeout: 30_000 })
    const divergence = panel.getByText('Token, per share').locator('..')
    await expect(divergence).toBeVisible()

    // The header price and the "Token, per share" figure are the same quote.
    const perShare = (await divergence.innerText()).replace(/\s+/g, ' ')
    const shown = parseUsd(perShare)
    const shownText = /\$[\d,]+\.\d{2}/.exec(perShare)![0]
    expect(await panel.getByText(shownText, { exact: true }).count()).toBeGreaterThanOrEqual(2)

    // And it is the reference price, not the raw token price, within the drift
    // of a quote that is polled.
    expect(relativeGap(shown, Number(quote!.reference_price))).toBeLessThan(PRICE_DRIFT)

    if (quote!.divergence) {
      // The gap line agrees with the two prices beside it, in sign and size.
      // The whole card: the nearest block holding both prices and the gap line.
      const block = panel
        .getByText('Token, per share')
        .locator('xpath=ancestor::div[.//*[normalize-space(text())="Gap"]][1]')
      const card = (await block.innerText()).replace(/\s+/g, ' ')
      const share = /Share[^$]*(\$[\d,]+\.\d{2})/.exec(card)
      const gap = /Gap ([+-]?\d+\.\d{3})%/.exec(card)
      expect(share, card).not.toBeNull()
      expect(gap, card).not.toBeNull()
      const sharePrice = parseUsd(share![1]!)
      const computed = ((shown - sharePrice) / sharePrice) * 100
      // Both prices are rounded to the cent before this sum, the gap is not.
      expect(Math.abs(computed - Number(gap![1]))).toBeLessThan(0.01)
      expect(card).toMatch(/\d+\.\d+ shares per token/)

      // The raw multiplier, once explained, is the one the server holds.
      await panel.getByRole('button', { name: 'Why these two can be compared' }).click()
      await expect(panel).toContainText(`is ${quote!.multiplier} shares, not one`)
      await panel.getByRole('button', { name: 'Why these two can be compared' }).click()
    }

    // The chart is drawn, not merely intended.
    await expect(panel.locator('.catalyst-chart canvas').first()).toBeAttached({ timeout: 30_000 })

    // The markets table, when the server knows any market for this token.
    const pools = await backendJson<{ returned_count: number }>(
      `${listing.prefix}/stocks/NVDA/pools`
    )
    if (pools && pools.returned_count > 0) {
      await expect(panel).toContainText(`${quote!.symbol} markets`)
      const rows = panel.locator('[aria-label$=" market"]')
      await expect(rows.first()).toContainText(/\$[\d,.]+/, { timeout: 30_000 })
    }

    // The company's numbers, labelled as the company's.
    const high = quote!.fundamentals?.week52_high
    if (high) {
      await expect(panel).toContainText('52-week range')
      await expect(panel).toContainText('reported by its exchange, not the chain')
      await expect(panel).toContainText(`$${Number(high).toFixed(2)}`)
    }

    // A tradable token offers the purchase by name.
    if (quote!.tradability !== 'unavailable') {
      await expect(panel.getByRole('button', { name: `Buy ${quote!.symbol}` })).toBeVisible()
    }
  })
})

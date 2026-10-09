import { expect, test } from '../src/fixtures.js'

/**
 * The backend is reached from x.com itself.
 *
 * Chrome treats a content script's fetch as coming from the page's origin, and
 * a public https origin reaching http://localhost is a Local Network Access
 * request, blocked unless the server opts in on the preflight. That is how the
 * extension once did nothing at all on the real site while every local check
 * passed.
 */
test.describe('reaching the backend from x.com', () => {
  test('is not blocked as a local network request', async ({ xTab }) => {
    // The listed tickers decide which posts get a pill, so a pill appearing at
    // all proves the request came back.
    await expect(xTab.page.locator('.catalyst-tweet-button-mount').first()).toBeAttached({
      timeout: 30_000,
    })

    // And nothing on the tab was refused since it opened.
    expect(xTab.refusals, `Chrome refused a request:\n${xTab.refusals.join('\n')}`).toEqual([])
  })
})

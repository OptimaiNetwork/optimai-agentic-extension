import { backendJson, parseUsd, relativeGap, selectedListing } from '../src/backend.js'
import { expect, test } from '../src/fixtures.js'

/** How many posts are checked. They are whatever X shows, so a few is plenty. */
const POSTS_CHECKED = 6
/** Pills shown before the rest fold behind "N Tokens". Mirrors VISIBLE_PILLS in tweet-button.tsx. */
const VISIBLE_PILLS = 2
/** The sweep runs every 2s; this waits out two of them. */
const TWO_SWEEPS_MS = 5_000
const PRICE_DRIFT = 0.005

interface PostOnPage {
  index: number
  /** The post's own cashtags, without any quoted post's, as X wrote them. */
  cashtags: string[]
  /** The symbols the extension's pills name, in order. */
  pills: string[]
  /** True when the row folds extra tokens behind a "N Tokens" pill. */
  folded: boolean
  mounts: number
}

/** Read the first posts on the live timeline, as they are right now. */
const readPosts = (page: import('@playwright/test').Page) =>
  page.evaluate((limit) => {
    const posts = Array.from(document.querySelectorAll('article[data-testid="tweet"]'))
    return posts.slice(0, limit).map((post, index) => {
      const quoted = post.querySelector('[data-testid="quotedTweet"]')
      const cashtags = Array.from(
        post.querySelectorAll('[data-testid="tweetText"] a[href*="=cashtag_click"]')
      )
        .filter((anchor) => !quoted?.contains(anchor))
        .map((anchor) => (anchor.textContent ?? '').replace(/^\$/, '').toUpperCase())
      const pills = Array.from(
        post.querySelectorAll('.catalyst-tweet-market-pill:not(.catalyst-tweet-market-more)')
      ).map((pill) => pill.querySelector('.catalyst-tweet-market-symbol')?.textContent ?? '')
      return {
        index,
        cashtags: [...new Set(cashtags)],
        pills,
        folded: Boolean(post.querySelector('.catalyst-tweet-market-more')),
        mounts: post.querySelectorAll('.catalyst-tweet-button-mount').length,
      }
    })
  }, POSTS_CHECKED) as Promise<PostOnPage[]>

test.describe('the market pills on real posts', () => {
  test('one row per post, one pill per cashtag the issuer lists, none for the rest', async ({
    xTab,
  }) => {
    // Arrange: the shared tab is a $NVDA search, so the first post names NVDA.
    const { page } = xTab
    await expect(page.locator('.catalyst-tweet-button-mount').first()).toBeAttached({
      timeout: 30_000,
    })
    await page.waitForTimeout(TWO_SWEEPS_MS)
    const listing = await selectedListing(page.locator('#catalyst-extension-container'))
    const posts = await readPosts(page)
    expect(posts.length).toBeGreaterThan(0)

    // The server decides what is listable, so ask it about every cashtag seen.
    const symbolOf = new Map<string, string | null>()
    for (const tag of new Set(posts.flatMap((post) => post.cashtags))) {
      const token = await backendJson<{ symbol: string }>(
        `${listing.prefix}/stocks/resolve?cashtag=${tag}`
      )
      symbolOf.set(tag, token?.symbol ?? null)
    }

    for (const post of posts) {
      const listed = [
        ...new Set(post.cashtags.map((tag) => symbolOf.get(tag)).filter(Boolean)),
      ] as string[]
      const where = `post ${post.index} (${post.cashtags.join(', ') || 'no cashtags'})`

      // Silence beats an empty panel: nothing listable, no row at all.
      if (!listed.length) {
        expect(post.mounts, where).toBe(0)
        continue
      }
      // Exactly one row, however many sweeps have run.
      expect(post.mounts, where).toBe(1)
      // Every pill names a token the post itself mentioned, never a quoted one.
      for (const pill of post.pills) expect(listed, where).toContain(pill)
      expect(new Set(post.pills).size, `${where}: a token pilled twice`).toBe(post.pills.length)
      expect(post.pills.length, where).toBe(Math.min(listed.length, VISIBLE_PILLS))
      expect(post.folded, where).toBe(listed.length > VISIBLE_PILLS)
    }
  })

  test('a pill opens the panel on its token, at the price it showed', async ({ xTab }) => {
    const { page } = xTab
    const pill = page
      .locator('article[data-testid="tweet"] .catalyst-tweet-market-pill', {
        has: page.locator('.catalyst-tweet-market-price'),
      })
      .first()
    await expect(pill).toBeAttached({ timeout: 30_000 })
    const symbol = await pill.locator('.catalyst-tweet-market-symbol').innerText()
    const pillPrice = parseUsd(await pill.locator('.catalyst-tweet-market-price').innerText())

    // Act
    await pill.click()

    // Assert: the panel is on the same token, at the same per share price
    // within the drift of two polled reads.
    const panel = page.locator('#catalyst-extension-container')
    await expect(panel).toHaveAttribute('data-open', 'true')
    const perShare = panel.getByText('Token, per share').locator('..')
    await expect(perShare).toBeVisible({ timeout: 30_000 })
    await expect(panel).toContainText(symbol)
    const panelPrice = parseUsd(await perShare.innerText())
    expect(relativeGap(panelPrice, pillPrice)).toBeLessThan(PRICE_DRIFT)
  })
})

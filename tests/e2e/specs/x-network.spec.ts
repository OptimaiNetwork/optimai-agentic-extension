import { expect, test } from '../src/fixtures.js'
import { seenXResponses } from '../src/live-x.js'

/** The operations the MAIN-world hook forwards. Mirrors WANTED in pages/content/src/matches/x-network. */
const WANTED = new Set([
  'SearchTimeline',
  'HomeTimeline',
  'HomeLatestTimeline',
  'UserTweets',
  'TweetDetail',
])

test.describe('reading X’s own traffic', () => {
  test('catches the search timeline X loaded, and nothing it has no use for', async ({ xTab }) => {
    // The page made dozens of GraphQL calls on load; the hook asks X for
    // nothing and only forwards what X was fetching anyway.
    await expect
      .poll(async () => (await seenXResponses(xTab.page)).map((seen) => seen.operation), {
        timeout: 30_000,
      })
      .toContain('SearchTimeline')

    const seen = await seenXResponses(xTab.page)
    expect(seen.find((entry) => entry.operation === 'SearchTimeline')?.status).toBe(200)
    for (const entry of seen) expect([...WANTED], JSON.stringify(entry)).toContain(entry.operation)
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { parsePost, parseTimeline, unwrapTweet } from './parse-timeline'

/**
 * Shape captured from a live SearchTimeline on 2026-09-19, with the posts
 * replaced. The raw capture is not in this repo because it was real people's
 * posts and this repo is public.
 */
const FIXTURE = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../../../../../../../fixtures/x/search-timeline.json'),
    'utf8'
  )
)

const tweet = (over: Record<string, unknown> = {}) => ({
  __typename: 'Tweet',
  rest_id: '1',
  legacy: { full_text: 'hello', id_str: '1' },
  core: { user_results: { result: { core: { screen_name: 'someone', name: 'Someone' } } } },
  ...over,
})

const timelineOf = (entries: unknown[]) => ({
  data: {
    search_by_raw_query: {
      search_timeline: { timeline: { instructions: [{ type: 'TimelineAddEntries', entries }] } },
    },
  },
})

const tweetEntry = (result: unknown) => ({
  entryId: 'tweet-1',
  content: {
    entryType: 'TimelineTimelineItem',
    itemContent: { itemType: 'TimelineTweet', tweet_results: { result } },
  },
})

describe('parseTimeline against a real SearchTimeline shape', () => {
  it('reads the posts X returned', () => {
    // Act
    const result = parseTimeline(FIXTURE)

    // Assert
    expect(result.outcome).toBe('ok')
    expect(result.posts).toHaveLength(3)
    expect(result.posts[0].text).toContain('$NVDA')
  })

  it('takes the ticker X already resolved rather than parsing the text', () => {
    // Act
    const [post] = parseTimeline(FIXTURE).posts

    // Assert — the cashtag arrives with its ticker and company name looked up,
    // three levels down in tag.info.info.
    expect(post.symbols).toEqual([{ text: 'NVDA', ticker: 'NVDA', name: 'NVIDIA Corp' }])
  })

  it('finds the follower count where X actually keeps it', () => {
    // Act
    const [post] = parseTimeline(FIXTURE).posts

    // Assert — relationship_counts, not legacy.followers_count, which is absent
    // on current responses and would read as undefined without a word of warning.
    expect(post.author).toMatchObject({ handle: 'analyst_one', followers: 41200, verified: true })
  })

  it('reads the view count X sends as a string', () => {
    // Act
    const [post] = parseTimeline(FIXTURE).posts

    // Assert
    expect(post.metrics).toMatchObject({ views: 9100, likes: 812, reposts: 143 })
  })

  it('counts the price card as an entry but not as a post', () => {
    // Act
    const { coverage, posts } = parseTimeline(FIXTURE)

    // Assert — TimelineSmartTag is the cashtag card. It is an entry in the same
    // list as the tweets and it is not one.
    expect(coverage.otherEntries).toBe(1)
    expect(posts.every((post) => post.id !== 'NVDA')).toBe(true)
  })
})

describe('telling "nothing there" apart from "we stopped understanding"', () => {
  it('accepts a genuinely empty timeline', () => {
    // Arrange — a real, recognised envelope holding only a cursor.
    const body = timelineOf([
      { entryId: 'cursor-bottom', content: { entryType: 'TimelineTimelineCursor', value: 'abc' } },
    ])

    // Act
    const result = parseTimeline(body)

    // Assert — an empty list is a fine answer when the envelope was understood.
    expect(result.outcome).toBe('ok')
    expect(result.posts).toEqual([])
  })

  it('refuses to call a renamed instruction an empty result', () => {
    // Arrange
    const body = {
      data: {
        search_by_raw_query: {
          search_timeline: {
            timeline: { instructions: [{ type: 'TimelineSomethingNew', entries: [] }] },
          },
        },
      },
    }

    // Act
    const result = parseTimeline(body)

    // Assert
    expect(result).toMatchObject({ outcome: 'drift', reason: 'UNSUPPORTED_TIMELINE' })
  })

  it('refuses to call unreadable entries an empty result', () => {
    // Arrange — entries arrive, and none of them parse.
    const body = timelineOf([tweetEntry({ __typename: 'Tweet', legacy: {} })])

    // Act
    const result = parseTimeline(body)

    // Assert
    expect(result).toMatchObject({ outcome: 'drift', reason: 'UNSUPPORTED_TIMELINE' })
    expect(result.coverage.unsupportedTweetEntries).toBe(1)
  })

  it('reports partial drift while most entries still parse', () => {
    // Arrange — four good, two broken. Nothing looks wrong from the outside.
    const entries = [
      ...[1, 2, 3, 4].map((n) =>
        tweetEntry(tweet({ rest_id: String(n), legacy: { full_text: 't', id_str: String(n) } }))
      ),
      ...[5, 6].map(() => tweetEntry({ __typename: 'Tweet' })),
    ]

    // Act
    const result = parseTimeline(timelineOf(entries))

    // Assert — a third of the timeline is being dropped silently. The count that
    // reveals it is computed either way; this is the consumer for it.
    expect(result).toMatchObject({ outcome: 'drift', reason: 'PARTIAL_DRIFT' })
    expect(result.posts).toHaveLength(4)
  })

  it('does not mistake a missing timeline for an empty one', () => {
    // Act / Assert
    expect(parseTimeline({ data: {} })).toMatchObject({
      outcome: 'drift',
      reason: 'MISSING_TIMELINE',
    })
    expect(parseTimeline('not json at all')).toMatchObject({
      outcome: 'drift',
      reason: 'MALFORMED_BODY',
    })
  })

  it('treats a tombstone as expected, not as drift', () => {
    // Arrange — a deleted or hidden post in an otherwise readable timeline.
    const body = timelineOf([
      tweetEntry(tweet()),
      { entryId: 'x', content: { itemContent: { itemType: 'TimelineTombstone' } } },
    ])

    // Act
    const result = parseTimeline(body)

    // Assert
    expect(result.outcome).toBe('ok')
    expect(result.coverage.tombstoneEntries).toBe(1)
  })
})

describe('unwrapping what X wraps', () => {
  it('reaches the post inside a visibility wrapper', () => {
    // Arrange — X wraps posts whose reach it has limited. Reading the wrapper
    // directly finds no text, so the post disappears — and the posts that
    // disappear are exactly the ones somebody wanted suppressed.
    const wrapped = { __typename: 'TweetWithVisibilityResults', tweet: tweet({ rest_id: '9' }) }

    // Act
    const post = parsePost(wrapped)

    // Assert
    expect(post?.id).toBe('9')
  })

  it('accepts an unlabelled object shaped like a post', () => {
    // Arrange — the result of a just-published post arrives with no __typename.
    const unlabelled = { rest_id: '5', legacy: { full_text: 'just posted' } }

    // Act / Assert
    expect(unwrapTweet(unlabelled)).toBeTruthy()
  })

  it('refuses anything X labels as something else', () => {
    // Arrange — a user object carries rest_id too, which is why the structural
    // test needs text as well, and why an explicit label always wins.
    const user = { __typename: 'User', rest_id: '7', legacy: { full_text: 'not a post' } }

    // Act / Assert
    expect(unwrapTweet(user)).toBeUndefined()
  })

  it('prefers the long-form body over the truncated copy', () => {
    // Arrange — a long post carries its full text in note_tweet and 280
    // characters of it in legacy.full_text, with nothing to say it was cut.
    const long = tweet({
      note_tweet: { note_tweet_results: { result: { text: 'the whole thing' } } },
      legacy: { full_text: 'the whole thi…', id_str: '1' },
    })

    // Act / Assert
    expect(parsePost(long)?.text).toBe('the whole thing')
  })
})

describe('reading the entries X groups inside a module', () => {
  const moduleEntry = (results: unknown[]) => ({
    entryId: 'conversation-9',
    content: {
      entryType: 'TimelineTimelineModule',
      items: results.map((result, index) => ({
        entryId: `conversation-9-${index}`,
        item: { itemContent: { itemType: 'TimelineTweet', tweet_results: { result } } },
      })),
    },
  })

  it('reads the posts inside a conversation module', () => {
    // Arrange — search groups a matching reply chain under one entry. Reading
    // only the outer entry drops every post in it.
    const body = timelineOf([
      tweetEntry(tweet({ rest_id: '1', legacy: { full_text: 'top level', id_str: '1' } })),
      moduleEntry([
        tweet({ rest_id: '2', legacy: { full_text: 'in the thread', id_str: '2' } }),
        tweet({ rest_id: '3', legacy: { full_text: 'reply to it', id_str: '3' } }),
      ]),
    ])

    // Act
    const result = parseTimeline(body)

    // Assert
    expect(result.outcome).toBe('ok')
    expect(result.posts.map((post) => post.id)).toEqual(['1', '2', '3'])
  })

  it('counts a module of non-posts as entries it chose not to read', () => {
    // Arrange — the module a search timeline actually returns is a "People"
    // block. It is correctly not a post, and it is not drift either.
    const people = {
      entryId: 'toptabsrpusermodule-1',
      content: {
        entryType: 'TimelineTimelineModule',
        items: [1, 2, 3].map((n) => ({
          entryId: `user-${n}`,
          item: { itemContent: { itemType: 'TimelineUser' } },
        })),
      },
    }

    // Act
    const result = parseTimeline(timelineOf([tweetEntry(tweet()), people]))

    // Assert
    expect(result.outcome).toBe('ok')
    expect(result.posts).toHaveLength(1)
    expect(result.coverage.otherEntries).toBe(3)
  })
})

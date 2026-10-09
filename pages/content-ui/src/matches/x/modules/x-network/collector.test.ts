import { beforeEach, describe, expect, it, vi } from 'vitest'

import { __reset, driftSeen, postsFor, startCollecting, subscribe } from './collector'

const fire = (body: unknown) =>
  document.dispatchEvent(
    new CustomEvent('catalyst:x-response', {
      detail: JSON.stringify({
        operation: 'SearchTimeline',
        status: 200,
        body: JSON.stringify(body),
      }),
    })
  )

const tweet = (id: string, ticker: string, createdAt = 'Sat Sep 19 06:00:00 +0000 2026') => ({
  entryId: `tweet-${id}`,
  content: {
    entryType: 'TimelineTimelineItem',
    itemContent: {
      itemType: 'TimelineTweet',
      tweet_results: {
        result: {
          __typename: 'Tweet',
          rest_id: id,
          legacy: {
            id_str: id,
            full_text: `$${ticker} something`,
            created_at: createdAt,
            entities: {
              symbols: [{ text: ticker, tag: { info: { info: { ticker, name: 'X Corp' } } } }],
            },
          },
          core: { user_results: { result: { core: { screen_name: 'someone', name: 'Someone' } } } },
        },
      },
    },
  },
})

const timeline = (entries: unknown[]) => ({
  data: {
    search_by_raw_query: {
      search_timeline: { timeline: { instructions: [{ type: 'TimelineAddEntries', entries }] } },
    },
  },
})

describe('collecting what the page already loaded', () => {
  beforeEach(() => {
    __reset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T08:00:00Z'))
    startCollecting()
  })

  it('files posts under the ticker X resolved', () => {
    // Act
    fire(timeline([tweet('1', 'NVDA'), tweet('2', 'TSLA')]))

    // Assert
    expect(postsFor('NVDA')).toHaveLength(1)
    expect(postsFor('TSLA')).toHaveLength(1)
    expect(postsFor('nvda')).toHaveLength(1)
  })

  it('does not count the same post twice when X serves it again', () => {
    // Arrange — X re-serves the same entries constantly as you scroll back and
    // forth, and a duplicate would weight one post twice in the scoring.
    fire(timeline([tweet('1', 'NVDA')]))

    // Act
    fire(timeline([tweet('1', 'NVDA'), tweet('2', 'NVDA')]))

    // Assert
    expect(postsFor('NVDA')).toHaveLength(2)
  })

  it('drops posts old enough to be about something else', () => {
    // Act — three days back. A catalyst that old is not what somebody scrolling
    // now is asking about.
    fire(timeline([tweet('1', 'NVDA', 'Wed Sep 16 06:00:00 +0000 2026')]))

    // Assert
    expect(postsFor('NVDA')).toHaveLength(0)
  })

  it('remembers that the schema moved, instead of looking like a quiet day', () => {
    // Act
    fire({ data: { search_by_raw_query: { search_timeline: { timeline: { instructions: [] } } } } })

    // Assert — an empty panel and a broken parser look identical to a user. This
    // is what lets the panel tell them apart.
    expect(driftSeen()).toBe('MISSING_TIMELINE')
  })

  it('tells subscribers when something new arrived', () => {
    // Arrange
    const listener = vi.fn()
    subscribe(listener)

    // Act
    fire(timeline([tweet('1', 'NVDA')]))
    fire(timeline([tweet('1', 'NVDA')]))

    // Assert — the second delivery is entirely duplicates, so nothing changed
    // and nothing should re-render.
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('ignores anything that is not a timeline it can read', () => {
    // Act
    document.dispatchEvent(new CustomEvent('catalyst:x-response', { detail: 'not json' }))
    fire({ data: { viewer_v2: {} } })

    // Assert
    expect(postsFor('NVDA')).toHaveLength(0)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { __reset, startCollecting } from './collector'
import { __resetEvidence, beginExecution, endExecution, lastCompletedFor } from './evidence'

/**
 * Attribution, which is the part that decides whether an answer is about the
 * search that was just run or about whatever the tab happened to be showing.
 *
 * Each of these cases has a real failure behind it: a response to the previous
 * identical search arriving late, a Top response landing during a Latest run,
 * and a query that merely looks similar.
 */

interface Envelope {
  query?: string
  product?: string
  requestedAt?: number
  capturedAt?: number
  status?: number
  operation?: string
  sequence?: number
  cursor?: string
}

const fire = (body: unknown, envelope: Envelope = {}) =>
  document.dispatchEvent(
    new CustomEvent('catalyst:x-response', {
      detail: JSON.stringify({
        captureId: `cap-${envelope.sequence ?? 1}`,
        sequence: envelope.sequence ?? 1,
        operation: envelope.operation ?? 'SearchTimeline',
        url: 'https://x.com/i/api/graphql/abc/SearchTimeline',
        status: envelope.status ?? 200,
        requestedAt: envelope.requestedAt ?? Date.now(),
        capturedAt: envelope.capturedAt ?? Date.now(),
        query: envelope.query,
        product: envelope.product,
        cursor: envelope.cursor,
        body: JSON.stringify(body),
      }),
    })
  )

const tweet = (id: string, text = 'Nvidia said something today') => ({
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
            full_text: text,
            created_at: 'Sat Sep 19 06:00:00 +0000 2026',
            entities: { symbols: [] },
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

describe('attributing responses to the search that asked for them', () => {
  beforeEach(() => {
    __reset()
    __resetEvidence()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T08:00:00Z'))
    startCollecting()
  })

  it('keeps a post with no cashtag at all', () => {
    // Arrange — the old collector indexed by ticker, so a post saying only
    // "Nvidia" belonged to nothing and was invisible to research.
    const execution = beginExecution('nvidia earnings', 'latest')

    // Act
    fire(timeline([tweet('1')]), { query: 'nvidia earnings', product: 'Latest' })

    // Assert
    expect(execution.posts.size).toBe(1)
    expect([...execution.posts.values()][0].text).toContain('Nvidia')
  })

  it('refuses a response to the previous identical search', () => {
    // Arrange — same query, but the request left before this run began.
    const startedAt = Date.now()
    const execution = beginExecution('nvidia earnings', 'latest')

    // Act
    fire(timeline([tweet('1')]), {
      query: 'nvidia earnings',
      product: 'Latest',
      requestedAt: startedAt - 5_000,
    })

    // Assert — collected by the page, not counted as this run's evidence.
    expect(execution.posts.size).toBe(0)
  })

  it('refuses a response for a different query', () => {
    // Arrange
    const execution = beginExecution('nvidia earnings', 'latest')

    // Act
    fire(timeline([tweet('1')]), { query: 'tesla robotaxi', product: 'Latest' })

    // Assert
    expect(execution.posts.size).toBe(0)
  })

  it('refuses a Top response while a Latest run is collecting', () => {
    // Arrange — the two tabs return different result sets for one query.
    const execution = beginExecution('nvidia earnings', 'latest')

    // Act
    fire(timeline([tweet('1')]), { query: 'nvidia earnings', product: 'Top' })

    // Assert
    expect(execution.posts.size).toBe(0)
  })

  it('counts a re-served post once and records the batch anyway', () => {
    // Arrange — X re-serves entries constantly as the page scrolls.
    const execution = beginExecution('nvidia earnings', 'latest')

    // Act
    fire(timeline([tweet('1')]), { query: 'nvidia earnings', product: 'Latest', sequence: 1 })
    fire(timeline([tweet('1'), tweet('2')]), {
      query: 'nvidia earnings',
      product: 'Latest',
      sequence: 2,
    })

    // Assert — two unique posts, two batches. A stalled run must still be able
    // to tell "X answered with nothing new" from "X stopped answering".
    expect(execution.posts.size).toBe(2)
    expect(execution.batches).toHaveLength(2)
  })

  it('ignores whitespace but not case when matching a query', () => {
    // Arrange — case and quoting change what X returns; spacing does not.
    const execution = beginExecution('nvidia  earnings', 'latest')

    // Act
    fire(timeline([tweet('1')]), { query: 'nvidia earnings', product: 'Latest', sequence: 1 })
    fire(timeline([tweet('2')]), { query: 'NVIDIA earnings', product: 'Latest', sequence: 2 })

    // Assert
    expect(execution.posts.size).toBe(1)
  })

  it('offers a finished run back only for the same query and mode', () => {
    // Arrange
    const execution = beginExecution('nvidia earnings', 'latest')
    fire(timeline([tweet('1')]), { query: 'nvidia earnings', product: 'Latest' })
    endExecution(execution.id)

    // Assert
    expect(lastCompletedFor('nvidia earnings', 'latest')?.id).toBe(execution.id)
    expect(lastCompletedFor('nvidia earnings', 'top')).toBeUndefined()
    expect(lastCompletedFor('tesla robotaxi', 'latest')).toBeUndefined()
  })

  it('stops attributing once the run has ended', () => {
    // Arrange
    const execution = beginExecution('nvidia earnings', 'latest')
    endExecution(execution.id)

    // Act
    fire(timeline([tweet('1')]), { query: 'nvidia earnings', product: 'Latest' })

    // Assert
    expect(execution.posts.size).toBe(0)
  })

  it('does not attribute a home timeline response to a search', () => {
    // Arrange
    const execution = beginExecution('nvidia earnings', 'latest')

    // Act
    fire(timeline([tweet('1')]), {
      query: 'nvidia earnings',
      product: 'Latest',
      operation: 'HomeTimeline',
    })

    // Assert
    expect(execution.posts.size).toBe(0)
  })
})

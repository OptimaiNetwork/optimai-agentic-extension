import { CatalystApiError } from './catalyst'
import { describeRequestFailure, isNotFound, isUnreachable, statusOf } from './request-error'
import { describe, expect, it } from 'vitest'

describe('telling a dead backend apart from an unhappy one', () => {
  it('reads status 0 as nothing having answered', () => {
    expect(isUnreachable(new CatalystApiError('Failed to fetch', 0))).toBe(true)
    expect(statusOf(new CatalystApiError('Failed to fetch', 0))).toBeUndefined()
  })

  it('does not depend on how the browser worded the fetch failure', () => {
    // Safari says "Load failed", Firefox says "NetworkError when attempting to
    // fetch resource", and an aborted timeout says neither. The old test was a
    // regex over this sentence; every one of these is status 0.
    for (const message of ['Load failed', 'NetworkError', 'The user aborted a request.', '']) {
      expect(isUnreachable(new CatalystApiError(message, 0)), message).toBe(true)
    }
  })

  it('reads an HTTP reply as the backend having answered', () => {
    const answered = new CatalystApiError('No tradable tokenized stock for ‘ZZZZ’', 404)
    expect(isUnreachable(answered)).toBe(false)
    expect(statusOf(answered)).toBe(404)
    expect(isNotFound(answered)).toBe(true)
  })

  it('does not call a 500 a miss', () => {
    // What made the detail pages lie: they branched on `isError` alone, so a
    // broken server read as a verdict about the token.
    expect(isNotFound(new CatalystApiError('Upstream failed', 500))).toBe(false)
    expect(isNotFound(new CatalystApiError('Failed to fetch', 0))).toBe(false)
  })
})

describe('what the panel prints instead of a setup guide', () => {
  it('gives the transport failure when nothing answered', () => {
    expect(describeRequestFailure(new CatalystApiError('Failed to fetch', 0))).toEqual({
      title: 'Could not reach the backend',
      detail: 'Failed to fetch',
    })
  })

  it('gives the server’s own sentence when it answered', () => {
    expect(describeRequestFailure(new CatalystApiError('No candles for NVDA', 502))).toEqual({
      title: 'The backend answered 502',
      detail: 'No candles for NVDA',
    })
  })

  it('does not print the status twice when the reply had no body', () => {
    // `fetcher.ts` uses `HTTP <status>` as its own fallback detail. Echoed
    // under the title it is the status twice and a reason zero times.
    expect(describeRequestFailure(new CatalystApiError('HTTP 500', 500))).toEqual({
      title: 'The backend answered 500',
      detail: 'The reply carried no error detail.',
    })
  })

  it('handles a throw that is not a CatalystApiError', () => {
    expect(describeRequestFailure(new Error('boom'))).toEqual({
      title: 'The request failed',
      detail: 'boom',
    })
  })

  it('never renders an empty reason', () => {
    // An empty `<code>` block reads as a rendering bug, not as an error.
    expect(describeRequestFailure(new CatalystApiError('   ', 0)).detail).toBe('Unknown error')
    expect(describeRequestFailure(undefined).detail).toBe('Unknown error')
  })
})

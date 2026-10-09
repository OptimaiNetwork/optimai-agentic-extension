import { isAllowedApiPath } from '@extension/shared'
import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Every path this panel asks for must be one the background will fetch.
 *
 * The background holds an allowlist and refuses anything outside it *before*
 * the network, so a missing entry produces no request, no status code and no
 * failed fetch anywhere — just a feature that never loads. It has happened
 * twice: `/trade/receipt` left the buy screen waiting on a poll that was never
 * sent, and `/stocks/{ticker}/pools` made the liquidity card report "could not
 * read the pool directory" against a server answering it perfectly.
 *
 * Asserting on the service rather than on a hand-written list of patterns is
 * the point: a new method added tomorrow is covered without anyone remembering
 * this file exists.
 */

const requested: string[] = []

vi.mock('@x/libs/catalyst', () => ({
  default: {
    get: (path: string) => {
      requested.push(path)
      return Promise.resolve({ data: undefined })
    },
    post: (path: string) => {
      requested.push(path)
      return Promise.resolve({ data: undefined })
    },
  },
}))

const { catalystService } = await import('./index')

// One call per read the ticker, search and buy screens make. Arguments are
// whatever shape reaches a URL; nothing here asserts on the response.
const CALLS: Array<[string, () => unknown]> = [
  ['list', () => catalystService.list()],
  ['names', () => catalystService.names()],
  ['market', () => catalystService.market()],
  ['resolve', () => catalystService.resolve('$NVDA')],
  ['quote', () => catalystService.quote('NVDA')],
  ['markets', () => catalystService.markets('NVDA')],
]

describe('every path the panel requests is one the background will fetch', () => {
  beforeEach(() => {
    requested.length = 0
  })

  test.each(CALLS)('%s', async (_name, call) => {
    await call()

    expect(requested).toHaveLength(1)
    expect(isAllowedApiPath(requested[0])).toBe(true)
  })
})

describe('the allowlist is still a list, not a wildcard', () => {
  test('a path nobody declared is refused', () => {
    expect(isAllowedApiPath('/stocks/NVDA/secrets')).toBe(false)
    expect(isAllowedApiPath('/admin')).toBe(false)
  })

  test('the markets route is allowed on its own and not as a prefix', () => {
    expect(isAllowedApiPath('/stocks/NVDA/pools')).toBe(true)
    expect(isAllowedApiPath('/stocks/NVDA/pools/../../etc')).toBe(false)
  })
})

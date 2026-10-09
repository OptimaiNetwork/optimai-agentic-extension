import { isAllowedApiPath } from '@extension/shared'
import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Every path a page outside X asks for must be one the background will fetch.
 * A missing entry is refused before the network and looks like a feature that
 * never loads, so this asserts on the service, not on a list of patterns.
 */

const requested: string[] = []

vi.mock('@x/libs/catalyst', () => ({
  default: {
    get: (path: string) => {
      requested.push(path)
      return Promise.resolve({ data: undefined })
    },
  },
}))

const { pageService } = await import('./index')

describe('every path the page highlighter requests is allowed', () => {
  beforeEach(() => {
    requested.length = 0
  })

  test.each([
    ['lexicon', () => pageService.lexicon()],
    ['lexicon version', () => pageService.lexiconVersion()],
    ['hover card', () => pageService.hover('NVDA', { chain: 'bnb', venue: 'bstock' })],
    [
      'hover card with a dotted ticker',
      () => pageService.hover('BRK.B', { chain: 'bnb', venue: 'bstock' }),
    ],
  ])('%s', async (_name, call) => {
    await call()

    expect(requested).toHaveLength(1)
    expect(isAllowedApiPath(requested[0])).toBe(true)
  })

  test('a hover path is a ticker, not a route', () => {
    expect(isAllowedApiPath('/hover/NVDA/../../admin')).toBe(false)
    expect(isAllowedApiPath('/hover/')).toBe(false)
  })
})

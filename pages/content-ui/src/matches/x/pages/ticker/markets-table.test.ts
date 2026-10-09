import { describe, expect, test } from 'vitest'

import {
  DEFAULT_SORT,
  ROWS_BEFORE_FOLD,
  formatFigure,
  formatPrice,
  nextSort,
  safeHref,
  sortMarkets,
  summariseMarkets,
  visibleMarkets,
} from './markets-table'
import type { MarketRow, MarketsSnapshot } from '@x/services/catalyst'

const market = (overrides: Partial<MarketRow> = {}): MarketRow => ({
  id: 'bnb:0x8fb4',
  dex_id: 'pancakeswap',
  venue: 'PancakeSwap V3',
  pair: 'NVDAB / USDT',
  token_address: '0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
  quote_address: '0x55d398326f99059ff775485246999027b3197955',
  quote_symbol: 'USDT',
  address: '0x8fb4',
  url: 'https://dexscreener.com/bsc/0x8fb4',
  price_usd: '228.52',
  liquidity_usd: '3980793.75',
  volume_24h_usd: '4074125',
  ...overrides,
})

const snapshot = (overrides: Partial<MarketsSnapshot> = {}): MarketsSnapshot => ({
  ticker: 'NVDA',
  symbol: 'NVDAB',
  chain: 'bnb',
  token_address: '0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
  source: 'dexscreener',
  fetched_at: '2026-09-22T16:23:07Z',
  source_updated_at: null,
  coverage: 'unknown',
  returned_count: 1,
  markets: [market()],
  logos: { pancakeswap: 'data:image/png;base64,AAAA' },
  invalid_row_count: 0,
  stale: false,
  unavailable_reason: null,
  ...overrides,
})

describe('summariseMarkets', () => {
  test('a read that worked becomes a table', () => {
    const view = summariseMarkets(snapshot())
    expect(view.kind).toBe('markets')
    if (view.kind !== 'markets') throw new Error('unreachable')
    expect(view.rows).toHaveLength(1)
    expect(view.fetchedAt).toBe('2026-09-22T16:23:07Z')
    // One mark per brand, not one per row: NVDAB has thirty markets and most of
    // them are PancakeSwap.
    expect(view.logos.pancakeswap).toBe('data:image/png;base64,AAAA')
  })

  test('a missing snapshot is "could not look", never "no markets"', () => {
    expect(summariseMarkets(undefined)).toEqual({
      kind: 'unavailable',
      symbol: null,
      reason: null,
    })
  })

  test('a snapshot that never read successfully is unavailable even with a reason', () => {
    // The server sends `fetched_at: null` when no read has ever worked, so a
    // timestamp is never invented for data we do not have.
    const view = summariseMarkets(
      snapshot({
        fetched_at: null,
        markets: [],
        returned_count: 0,
        unavailable_reason: 'rate-limited',
      })
    )
    expect(view).toEqual({ kind: 'unavailable', symbol: 'NVDAB', reason: 'rate-limited' })
  })

  test('an empty list from a successful read is a real empty answer', () => {
    const view = summariseMarkets(snapshot({ markets: [], returned_count: 0 }))
    expect(view.kind).toBe('empty')
  })

  test('a stale snapshot still shows its rows and says it is stale', () => {
    const view = summariseMarkets(snapshot({ stale: true, unavailable_reason: 'rate-limited' }))
    if (view.kind !== 'markets') throw new Error('unreachable')
    expect(view.rows).toHaveLength(1)
    expect(view.stale).toBe(true)
    expect(view.staleReason).toBe('rate-limited')
  })
})

describe('sortMarkets', () => {
  const rows = [
    market({ id: 'a', price_usd: '10', volume_24h_usd: '5', liquidity_usd: null }),
    market({ id: 'b', price_usd: '2', volume_24h_usd: '50', liquidity_usd: '7' }),
    market({ id: 'c', price_usd: null, volume_24h_usd: '500', liquidity_usd: '3' }),
  ]

  test('sorts numerically, not by the formatted string', () => {
    // '10' < '2' as strings. A string sort puts the $10 market below the $2 one.
    const ids = sortMarkets(rows, { key: 'price_usd', direction: 'asc' }).map((row) => row.id)
    expect(ids).toEqual(['b', 'a', 'c'])
  })

  test('missing values stay last when ascending', () => {
    // A row with no price is not the cheapest market; it is one we could not price.
    const ids = sortMarkets(rows, { key: 'price_usd', direction: 'asc' }).map((row) => row.id)
    expect(ids.at(-1)).toBe('c')
  })

  test('missing values stay last when descending too', () => {
    const ids = sortMarkets(rows, { key: 'price_usd', direction: 'desc' }).map((row) => row.id)
    expect(ids.at(-1)).toBe('c')
  })

  test('a real zero is a value, not a gap', () => {
    const withZero = [
      market({ id: 'z', volume_24h_usd: '0' }),
      market({ id: 'n', volume_24h_usd: null }),
    ]
    const ids = sortMarkets(withZero, { key: 'volume_24h_usd', direction: 'asc' }).map((r) => r.id)
    expect(ids).toEqual(['z', 'n'])
  })

  test('ties break on the market id so rows do not swap between renders', () => {
    const tied = [
      market({ id: 'b', volume_24h_usd: '5' }),
      market({ id: 'a', volume_24h_usd: '5' }),
    ]
    expect(sortMarkets(tied, DEFAULT_SORT).map((row) => row.id)).toEqual(['a', 'b'])
  })

  test('does not mutate the array it was given', () => {
    const original = [...rows]
    sortMarkets(rows, { key: 'price_usd', direction: 'asc' })
    expect(rows).toEqual(original)
  })

  test('the default is volume, highest first', () => {
    expect(sortMarkets(rows, DEFAULT_SORT).map((row) => row.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('nextSort', () => {
  test('clicking the active column flips its direction', () => {
    expect(nextSort({ key: 'price_usd', direction: 'desc' }, 'price_usd')).toEqual({
      key: 'price_usd',
      direction: 'asc',
    })
  })

  test('clicking another column starts it descending', () => {
    expect(nextSort({ key: 'price_usd', direction: 'asc' }, 'volume_24h_usd')).toEqual({
      key: 'volume_24h_usd',
      direction: 'desc',
    })
  })
})

describe('visibleMarkets', () => {
  const many = Array.from({ length: 12 }, (_, index) => market({ id: `m${index}` }))

  test('folds by default and shows everything once expanded', () => {
    expect(visibleMarkets(many, false)).toHaveLength(ROWS_BEFORE_FOLD)
    expect(visibleMarkets(many, true)).toHaveLength(12)
  })

  test('folding never drops a row from a short list', () => {
    expect(visibleMarkets(many.slice(0, 3), false)).toHaveLength(3)
  })
})

describe('formatPrice', () => {
  test('a normal price keeps two decimals', () => {
    expect(formatPrice('228.52')).toBe('$228.52')
  })

  test('a sub-cent price is never rendered as $0.00', () => {
    // The one thing a price column must not do: 0.00000042 is a real market.
    expect(formatPrice('0.00000042')).toBe('$0.00000042')
  })

  test('the server sending exponent notation still reads as a number', () => {
    // `Decimal("0.00000042").normalize()` is `4.2E-7`, and that is what arrives.
    expect(formatPrice('4.2E-7')).toBe('$0.00000042')
  })

  test('a price too small even for Intl still avoids claiming zero', () => {
    expect(formatPrice('1e-30')).not.toBe('$0')
  })

  test('a price between a cent and a dollar keeps four decimals', () => {
    expect(formatPrice('0.4235')).toBe('$0.4235')
  })

  test('missing, zero, negative and nonfinite all read as missing', () => {
    for (const value of [null, '0', '-3', 'NaN', 'Infinity', 'nonsense']) {
      expect(formatPrice(value)).toBe('N/A')
    }
  })

  test('thousands are grouped', () => {
    expect(formatPrice('5323.8787')).toBe('$5,323.88')
  })
})

describe('formatFigure', () => {
  test('volume and liquidity read at the magnitude the column is for', () => {
    expect(formatFigure('4074125')).toBe('$4.07M')
    expect(formatFigure('6920')).toBe('$6.92K')
  })

  test('a real zero stays a zero', () => {
    // Every venue on a quiet token reports $0 of 24h volume, and rounding that
    // up to "no figure" would hide the one thing the column is answering.
    expect(formatFigure('0')).toBe('$0')
  })

  test('an order book with no reserve reads N/A, not a dash and not $0', () => {
    // The live case: Manifest quotes NVDAon and reports no liquidity at all,
    // because it is not an AMM. `$0` would call the market empty.
    expect(formatFigure(null)).toBe('N/A')
    expect(formatFigure('nonsense')).toBe('N/A')
  })
})

describe('safeHref', () => {
  test.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox',
    'not a url',
  ])('%s never reaches an href', (url) => {
    // The panel renders inside a content script on x.com, so this would run on
    // that page when somebody clicked the row.
    expect(safeHref(url)).toBeUndefined()
  })

  test('http and https links are kept', () => {
    expect(safeHref('https://dexscreener.com/bsc/0x8fb4')).toBe(
      'https://dexscreener.com/bsc/0x8fb4'
    )
    expect(safeHref('http://example.com')).toBe('http://example.com')
  })

  test('a missing link is simply missing', () => {
    expect(safeHref(null)).toBeUndefined()
  })
})

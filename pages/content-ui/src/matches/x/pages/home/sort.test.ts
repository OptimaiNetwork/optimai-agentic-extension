import { DEFAULT_SORT, formatCompactUsd, nextSort, SORT_COLUMNS, sortRows } from './sort'
import type { SortChoice, TokenRow } from './sort'
import type { StockMarketItem, StockToken } from '@x/services/catalyst'
import { describe, expect, it } from 'vitest'

const token = (ticker: string): StockToken => ({
  symbol: `${ticker}B`,
  ticker,
  contract_address: `0x${ticker.toLowerCase()}`,
  chain_id: '56',
  provider: 'bstock',
  multiplier: '1',
  decimals: 18,
  name: `${ticker} Inc`,
  logo: null,
})

const row = (ticker: string, market?: Partial<StockMarketItem>): TokenRow => ({
  token: token(ticker),
  market: market
    ? ({
        symbol: `${ticker}B`,
        ticker,
        provider: 'bstock',
        multiplier: '1',
        reference_price: null,
        price_change_pct_24h: null,
        volume_24h: null,
        market_cap: null,
        total_supply: null,
        sparkline: null,
        fetched_at: null,
        error: null,
        ...market,
      } satisfies StockMarketItem)
    : undefined,
})

const tickers = (rows: TokenRow[]): string[] => rows.map((entry) => entry.token.ticker)

describe('ordering the token list', () => {
  const ROWS = [
    row('AAPL', {
      market_cap: '300',
      reference_price: '300',
      volume_24h: '10',
      price_change_pct_24h: '-1.5',
    }),
    row('NVDA', {
      market_cap: '900',
      reference_price: '900',
      volume_24h: '50',
      price_change_pct_24h: '2.5',
    }),
    row('TSLA', {
      market_cap: '500',
      reference_price: '500',
      volume_24h: '90',
      price_change_pct_24h: '0.5',
    }),
  ]

  it('opens on the largest market cap, the way a market list ranks', () => {
    // The cap is computed server-side from `totalSupply()` on the contract.
    // The API's own `marketCap` is null for all 77 bStocks.
    expect(DEFAULT_SORT).toEqual({ key: 'market_cap', direction: 'desc' })
    expect(tickers(sortRows(ROWS, DEFAULT_SORT))).toEqual(['NVDA', 'TSLA', 'AAPL'])
  })

  it('sorts by each metric the chips offer', () => {
    const by = (choice: SortChoice) => tickers(sortRows(ROWS, choice))

    expect(by({ key: 'reference_price', direction: 'desc' })).toEqual(['NVDA', 'TSLA', 'AAPL'])
    expect(by({ key: 'price_change_pct_24h', direction: 'desc' })).toEqual(['NVDA', 'TSLA', 'AAPL'])
    expect(by({ key: 'price_change_pct_24h', direction: 'asc' })).toEqual(['AAPL', 'TSLA', 'NVDA'])
    expect(by({ key: 'ticker', direction: 'asc' })).toEqual(['AAPL', 'NVDA', 'TSLA'])
  })

  it('never reorders the source array', () => {
    const original = [...ROWS]
    sortRows(ROWS, { key: 'market_cap', direction: 'asc' })

    expect(ROWS).toEqual(original)
  })

  it('keeps unpriced rows at the bottom in both directions', () => {
    // Ascending by price would otherwise open with every row the server could
    // not quote, which reads as a broken list rather than a sorted one.
    const mixed = [...ROWS, row('GS'), row('PYPL', { market_cap: null })]

    expect(tickers(sortRows(mixed, { key: 'market_cap', direction: 'asc' })).slice(-2)).toEqual([
      'GS',
      'PYPL',
    ])
    expect(tickers(sortRows(mixed, { key: 'market_cap', direction: 'desc' })).slice(-2)).toEqual([
      'GS',
      'PYPL',
    ])
  })

  it('breaks a tie on the ticker, so the order never jitters between renders', () => {
    const tied = [row('ZM', { market_cap: '100' }), row('AMD', { market_cap: '100' })]

    expect(tickers(sortRows(tied, { key: 'market_cap', direction: 'desc' }))).toEqual(['AMD', 'ZM'])
    expect(tickers(sortRows(tied, { key: 'market_cap', direction: 'asc' }))).toEqual(['AMD', 'ZM'])
  })

  it('ignores a value the server sent as something other than a number', () => {
    const broken = [row('AAPL', { market_cap: 'not a number' }), row('NVDA', { market_cap: '5' })]

    expect(tickers(sortRows(broken, { key: 'market_cap', direction: 'desc' }))).toEqual([
      'NVDA',
      'AAPL',
    ])
  })
})

describe('what a column header does when pressed', () => {
  it('flips direction when it is already the column in force', () => {
    const active: SortChoice = { key: 'market_cap', direction: 'desc' }
    const cap = SORT_COLUMNS.find((column) => column.key === 'market_cap')!

    expect(nextSort(active, cap)).toEqual({ key: 'market_cap', direction: 'asc' })
  })

  it('starts a new column at the direction that metric is usually read in', () => {
    const active: SortChoice = { key: 'market_cap', direction: 'asc' }
    const asset = SORT_COLUMNS.find((column) => column.key === 'ticker')!

    expect(nextSort(active, asset)).toEqual({ key: 'ticker', direction: 'asc' })
  })

  it('offers a column for every way the list can be ordered, and no more', () => {
    // The chips used to duplicate this list one row above the header. If a key
    // ever has no column again, it becomes unreachable rather than merely
    // undocumented.
    expect(SORT_COLUMNS.map((column) => column.key)).toEqual([
      'ticker',
      'market_cap',
      'reference_price',
      'price_change_pct_24h',
    ])
  })
})

describe('formatting a market number for a 500px panel', () => {
  it('compacts so a nine-figure cap does not push the row', () => {
    expect(formatCompactUsd('1420000')).toBe('$1.42M')
    expect(formatCompactUsd('987')).toBe('$987')
    expect(formatCompactUsd(null)).toBe('—')
    expect(formatCompactUsd('nonsense')).toBe('—')
  })
})

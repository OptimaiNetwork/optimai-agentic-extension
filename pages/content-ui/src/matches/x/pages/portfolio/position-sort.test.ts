import type { PortfolioPosition } from '@x/services/catalyst'
import { describe, expect, it } from 'vitest'

import { nextSort, sortPositions } from './position-sort'

const position = (ticker: string, fields: Partial<PortfolioPosition> = {}): PortfolioPosition => ({
  chain: 'bnb',
  venue: 'bstock',
  ticker,
  token_address: `0x${ticker}`,
  quantity: '1',
  cost_basis: '1',
  average_entry_price: '1',
  current_price: '1',
  market_value: '1',
  unrealized_pnl: '0',
  unrealized_pnl_percent: '0',
  price_source: 'bnb',
  weight_percent: '1',
  logo: null,
  ...fields,
})

const NVDA = position('NVDA', { market_value: '4666.92', unrealized_pnl: '666.92' })
const AAPL = position('AAPL', {
  chain: 'solana',
  venue: 'ondo',
  market_value: '4131.36',
  unrealized_pnl: '-12.5',
})
const TSLA = position('TSLA', { market_value: null, unrealized_pnl: null, weight_percent: null })
const SERVER_ORDER = [NVDA, AAPL, TSLA]
const tickers = (rows: PortfolioPosition[]) => rows.map((p) => p.ticker)

describe('sorting the assets table', () => {
  it('keeps the server order until a header is clicked', () => {
    expect(tickers(sortPositions(SERVER_ORDER, null))).toEqual(['NVDA', 'AAPL', 'TSLA'])
  })

  it('starts money columns largest first and word columns A to Z, then flips', () => {
    expect(nextSort(null, 'value')).toEqual({ key: 'value', direction: 'desc' })
    expect(nextSort(null, 'token')).toEqual({ key: 'token', direction: 'asc' })
    expect(nextSort({ key: 'value', direction: 'desc' }, 'value')).toEqual({
      key: 'value',
      direction: 'asc',
    })
    expect(nextSort({ key: 'value', direction: 'asc' }, 'pnl')).toEqual({
      key: 'pnl',
      direction: 'desc',
    })
  })

  it('leaves an unpriced position last whichever way value or P&L points', () => {
    expect(tickers(sortPositions(SERVER_ORDER, { key: 'value', direction: 'asc' }))).toEqual([
      'AAPL',
      'NVDA',
      'TSLA',
    ])
    expect(tickers(sortPositions(SERVER_ORDER, { key: 'pnl', direction: 'desc' }))).toEqual([
      'NVDA',
      'AAPL',
      'TSLA',
    ])
    expect(tickers(sortPositions(SERVER_ORDER, { key: 'pnl', direction: 'asc' }))).toEqual([
      'AAPL',
      'NVDA',
      'TSLA',
    ])
  })

  it('orders by ticker, and by chain then issuer', () => {
    expect(tickers(sortPositions(SERVER_ORDER, { key: 'token', direction: 'desc' }))).toEqual([
      'TSLA',
      'NVDA',
      'AAPL',
    ])
    expect(tickers(sortPositions(SERVER_ORDER, { key: 'chain', direction: 'desc' }))).toEqual([
      'AAPL',
      'NVDA',
      'TSLA',
    ])
  })

  it('does not reorder the list it was given', () => {
    const rows = [...SERVER_ORDER]
    sortPositions(rows, { key: 'token', direction: 'asc' })
    expect(tickers(rows)).toEqual(['NVDA', 'AAPL', 'TSLA'])
  })
})

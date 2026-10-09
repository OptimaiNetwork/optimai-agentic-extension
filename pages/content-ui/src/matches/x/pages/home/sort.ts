/**
 * How the Token list is ordered.
 *
 * The ordering lives on the column headers rather than in a row of chips above
 * them. The chips were a second row doing the first row's job: five pills
 * saying "Market cap / Volume / 24h / Price / A–Z" sat directly above a header
 * saying "# / ASSET / MKT CAP / PRICE / 24H", which is the same list of things
 * written twice. Clicking the header is also the idiom a table already implies,
 * so it needs no pills to explain itself.
 *
 * All of it is client-side. The catalog is 77 rows and every one of them is
 * already in memory, so a sort is free and a round trip would be slower than
 * the render it triggers.
 */

import type { StockMarketItem, StockToken } from '@x/services/catalyst'

export type SortKey = 'market_cap' | 'price_change_pct_24h' | 'reference_price' | 'ticker'

export type SortDirection = 'asc' | 'desc'

export interface SortChoice {
  key: SortKey
  direction: SortDirection
}

export interface SortColumn {
  key: SortKey
  label: string
  /** Which way round a first click should sort. Nobody wants the smallest cap first. */
  initialDirection: SortDirection
  /** Tailwind width for the cell, so the header and the rows cannot drift apart. */
  width: string
  align: 'left' | 'right'
}

/**
 * The columns, in the order they are drawn. Market cap ranks by default, the
 * way a market list does — it is computed server-side from `totalSupply()` on
 * the contract, because the API's own `marketCap`, `fdv`, `circulatingSupply`
 * and `totalHolders` are null for all 77 bStocks.
 */
export const SORT_COLUMNS: readonly SortColumn[] = [
  { key: 'ticker', label: 'Asset', initialDirection: 'asc', width: 'flex-1', align: 'left' },
  {
    key: 'market_cap',
    // Written out. The column is wide enough for it, and "Mkt cap" saved
    // sixteen pixels by making the reader expand the abbreviation instead.
    label: 'Market cap',
    initialDirection: 'desc',
    width: 'w-[80px]',
    align: 'right',
  },
  {
    key: 'reference_price',
    label: 'Price',
    initialDirection: 'desc',
    width: 'w-[76px]',
    align: 'right',
  },
  {
    key: 'price_change_pct_24h',
    label: '24h',
    initialDirection: 'desc',
    width: 'w-[60px]',
    align: 'right',
  },
]

/**
 * The width of a column, for the rows as well as the heading.
 *
 * The rows used to carry their own copy of these numbers. Widening a heading
 * then moved it off the values it named — by fifty pixels, cumulatively, which
 * is not a rounding error but did not look like a bug either. A column has one
 * width; this is where it lives.
 */
export const columnWidth = (key: SortKey): string =>
  SORT_COLUMNS.find((column) => column.key === key)?.width ?? ''

export const DEFAULT_SORT: SortChoice = { key: 'market_cap', direction: 'desc' }

/** A row as the list draws it: catalog metadata with whatever price arrived. */
export interface TokenRow {
  token: StockToken
  market?: StockMarketItem
}

const numeric = (value: string | null | undefined): number | null => {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const valueOf = (row: TokenRow, key: SortKey): number | string | null => {
  if (key === 'ticker') return row.token.ticker
  return numeric(row.market?.[key])
}

/**
 * Sort, keeping rows with no number at the bottom whichever way the sort runs.
 *
 * Ascending by price would otherwise open with every row the server could not
 * quote, which reads as a broken list rather than a sorted one.
 */
export const sortRows = (rows: readonly TokenRow[], choice: SortChoice): TokenRow[] => {
  const sign = choice.direction === 'asc' ? 1 : -1

  return [...rows].sort((left, right) => {
    const a = valueOf(left, choice.key)
    const b = valueOf(right, choice.key)

    if (a == null && b == null) return left.token.ticker.localeCompare(right.token.ticker)
    if (a == null) return 1
    if (b == null) return -1

    if (typeof a === 'string' || typeof b === 'string') {
      return sign * String(a).localeCompare(String(b))
    }
    if (a === b) return left.token.ticker.localeCompare(right.token.ticker)
    return sign * (a < b ? -1 : 1)
  })
}

/** Clicking the active column flips it; clicking another starts at its own default. */
export const nextSort = (current: SortChoice, column: SortColumn): SortChoice =>
  current.key === column.key
    ? { key: current.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { key: column.key, direction: column.initialDirection }

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

/** `$1.42M`, the way a market-cap column reads. */
export const formatCompactUsd = (value: string | null | undefined): string => {
  const parsed = numeric(value)
  return parsed == null ? '—' : `$${compact.format(parsed)}`
}

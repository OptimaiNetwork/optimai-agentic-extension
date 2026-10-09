import type { MarketRow, MarketsSnapshot } from '@x/services/catalyst'

import { formatCompactUsd } from './format'

/**
 * What the markets table shows and in what order, decided before anything renders.
 *
 * Pulled out of the component because the decisions are the part worth testing
 * and the part that goes subtly wrong: sorting formatted strings instead of
 * numbers, pushing missing values to the top, folding the list before sorting
 * it, and calling a failed read an empty market. The panel's test runner is
 * pure-functions-only by design, which makes this the seam.
 */

export const ROWS_BEFORE_FOLD = 5

/**
 * What a cell shows when the directory reports no figure for it.
 *
 * Spelled out rather than an em dash: a dash in a column of dollar amounts
 * reads as a minus sign or as zero depending on the reader, and the whole
 * reason this cell is blank is that the venue is an order book with no reserve
 * to report — which is not zero liquidity. `N/A` is also what a screen reader
 * announces usefully; `—` it reads as "em dash" or skips entirely.
 */
export const NO_FIGURE = 'N/A'

export type SortKey = 'price_usd' | 'volume_24h_usd' | 'liquidity_usd'
export type SortDirection = 'asc' | 'desc'

export interface Sort {
  key: SortKey
  direction: SortDirection
}

/** Volume first, like every market table: it is the one that ranks by activity. */
export const DEFAULT_SORT: Sort = { key: 'volume_24h_usd', direction: 'desc' }

export type MarketsView =
  /** The directory could not be read. Says nothing about this token's market. */
  | { kind: 'unavailable'; symbol: string | null; reason: string | null }
  /** A real, empty answer: the source looked and found nothing. */
  | { kind: 'empty'; symbol: string; chain: string }
  | {
      kind: 'markets'
      symbol: string
      rows: MarketRow[]
      logos: Record<string, string>
      total: number
      coverage: MarketsSnapshot['coverage']
      source: MarketsSnapshot['source']
      fetchedAt: string
      stale: boolean
      staleReason: string | null
    }

export const summariseMarkets = (snapshot: MarketsSnapshot | undefined): MarketsView => {
  // No snapshot, or one that never read successfully. Collapsing this into
  // "no markets" is the most misleading thing this table could do, and it is
  // what a plain `markets.length === 0` check does.
  if (!snapshot || !snapshot.fetched_at) {
    return {
      kind: 'unavailable',
      symbol: snapshot?.symbol ?? null,
      reason: snapshot?.unavailable_reason ?? null,
    }
  }
  if (snapshot.markets.length === 0) {
    return { kind: 'empty', symbol: snapshot.symbol, chain: snapshot.chain }
  }
  return {
    kind: 'markets',
    symbol: snapshot.symbol,
    rows: snapshot.markets,
    logos: snapshot.logos ?? {},
    total: snapshot.returned_count,
    coverage: snapshot.coverage,
    source: snapshot.source,
    fetchedAt: snapshot.fetched_at,
    // A stale snapshot still has rows and still has its own timestamp; what it
    // does not have is a successful read just now.
    stale: snapshot.stale,
    staleReason: snapshot.stale ? snapshot.unavailable_reason : null,
  }
}

/**
 * Sort the whole set, numerically, with missing values always last.
 *
 * "Always last" means in both directions: a row with no price is not the
 * cheapest market, it is a row we could not price, and floating it to the top
 * of an ascending sort would say the opposite.
 *
 * Ties break on liquidity before falling back to the market id. That is not
 * cosmetic: 14 of SLVon's 16 markets report zero 24h volume, so under the
 * default sort the first five rows were decided by pool address, and the two
 * deepest markets — $54K and $46K — sat hidden behind "Show all". The id
 * remains the final tie-break so the order is still stable between renders.
 */
export const sortMarkets = (rows: readonly MarketRow[], sort: Sort): MarketRow[] => {
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    const a = numeric(left[sort.key])
    const b = numeric(right[sort.key])
    if (a !== null && b !== null && a !== b) return (a - b) * factor
    if (a === null && b !== null) return 1
    if (b === null && a !== null) return -1
    if (sort.key !== 'liquidity_usd') {
      const byDepth = compareDepth(left, right)
      if (byDepth !== 0) return byDepth
    }
    return left.id.localeCompare(right.id)
  })
}

/** Deepest first, and never above a row that has a number when this one does not. */
const compareDepth = (left: MarketRow, right: MarketRow): number => {
  const a = numeric(left.liquidity_usd)
  const b = numeric(right.liquidity_usd)
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return b - a
}

/** `null` and anything unparseable is missing; a real `0` is a real zero. */
const numeric = (value: string | null): number | null => {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const visibleMarkets = (rows: readonly MarketRow[], expanded: boolean): MarketRow[] =>
  expanded ? [...rows] : rows.slice(0, ROWS_BEFORE_FOLD)

/** Clicking the active column flips it; clicking another starts it descending. */
export const nextSort = (current: Sort, key: SortKey): Sort =>
  current.key === key
    ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
    : { key, direction: 'desc' }

/**
 * A price with enough digits to be worth comparing.
 *
 * Two decimals is right for $228.56 and renders a real $0.00000042 market as
 * `$0.00`, which is the one thing a price column must not do. Below a cent the
 * formatter switches to significant digits.
 *
 * Significant digits via `Intl` rather than `toPrecision`, which returns
 * `4.20e-7` for that same market. The server already sends small numbers in
 * exponent form, because `Decimal("0.00000042").normalize()` is `4.2E-7`, and a
 * price column that answers the question with `e-7` in it has not answered it.
 */
export const formatPrice = (value: string | null): string => {
  if (value === null) return NO_FIGURE
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return NO_FIGURE
  if (parsed >= 1)
    return `$${parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (parsed >= 0.01) return `$${parsed.toFixed(4)}`
  const small = parsed.toLocaleString('en-US', { maximumSignificantDigits: 4 })
  // Far below a cent `Intl` gives up and rounds to "0", which would be the very
  // claim this branch exists to avoid.
  return small === '0' ? `$${parsed.toPrecision(3)}` : `$${small}`
}

/**
 * Volume and liquidity, at the magnitude the column is read for.
 *
 * Wraps the shared compact formatter only to put this table's own word in the
 * empty case, so both numeric columns and the price column agree on what a
 * missing figure looks like.
 */
export const formatFigure = (value: string | null): string => {
  const parsed = value === null ? NaN : Number(value)
  return Number.isFinite(parsed) ? formatCompactUsd(parsed) : NO_FIGURE
}

/**
 * A link safe to put in an `href`, or nothing.
 *
 * The server already refuses anything but http(s), and this is the second lock
 * on the same door: the panel renders inside a content script on x.com, so a
 * `javascript:` URL reaching an anchor would execute on that page when somebody
 * clicked the row.
 */
export const safeHref = (url: string | null): string | undefined => {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : undefined
  } catch {
    return undefined
  }
}

import type { PortfolioPosition } from '@x/services/catalyst'

import { CHAIN_NAME, VENUE_LABEL } from './format'

export type SortKey = 'token' | 'chain' | 'value' | 'pnl'
export type SortDirection = 'asc' | 'desc'
export interface PositionSort {
  key: SortKey
  direction: SortDirection
}

// Words read A to Z first; money reads largest first.
const FIRST_DIRECTION: Record<SortKey, SortDirection> = {
  token: 'asc',
  chain: 'asc',
  value: 'desc',
  pnl: 'desc',
}

/** A header click: a new column starts its natural way, the same one flips. */
export const nextSort = (current: PositionSort | null, key: SortKey): PositionSort =>
  current?.key === key
    ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: FIRST_DIRECTION[key] }

const text = (position: PortfolioPosition, key: 'token' | 'chain'): string =>
  key === 'token' ? position.ticker : `${CHAIN_NAME[position.chain]} ${VENUE_LABEL[position.venue]}`

const amount = (value: string | null): number | null => {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const money = (position: PortfolioPosition, key: 'value' | 'pnl'): number | null =>
  amount(key === 'value' ? position.market_value : position.unrealized_pnl)

/**
 * The rows in the order asked for; with none asked, the server's own (value,
 * largest first). A position with no price has no value or P&L to rank, so it
 * stays at the bottom whichever way those columns point.
 */
export const sortPositions = (
  positions: readonly PortfolioPosition[],
  sort: PositionSort | null
): PortfolioPosition[] => {
  if (!sort) return [...positions]
  const sign = sort.direction === 'asc' ? 1 : -1
  const { key } = sort
  return [...positions].sort((a, b) => {
    if (key === 'token' || key === 'chain') {
      return sign * text(a, key).localeCompare(text(b, key))
    }
    const left = money(a, key)
    const right = money(b, key)
    if (left == null || right == null) {
      return left == null && right == null ? 0 : left == null ? 1 : -1
    }
    return sign * (left - right)
  })
}

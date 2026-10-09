import { Skeleton } from '@extension/ui'

import { columnWidth } from './sort'

/**
 * A row's shape, before its numbers arrive.
 *
 * The list is filled by two requests, not one: the catalog names every token,
 * and a second call brings the price, the cap and the candles the sparkline is
 * drawn from. A row whose second half has not landed used to show a bare `…`
 * where the price goes and an empty gap where the line goes, which reads as a
 * token with no market rather than as one still loading.
 *
 * Every placeholder is laid out on the same `columnWidth()` the real cells use,
 * so nothing shifts sideways when the numbers replace them — the only change is
 * shimmer becoming text.
 */

/** The three cells that wait on the market call. Rendered inside a real row. */
export const MarketCellsSkeleton = () => (
  <>
    <span className={`flex-shrink-0 ${columnWidth('market_cap')}`}>
      <Skeleton className="ml-auto h-3 w-14" />
    </span>
    <span className={`flex-shrink-0 ${columnWidth('reference_price')}`}>
      <Skeleton className="ml-auto h-3.5 w-16" />
    </span>
    <span
      className={`flex flex-shrink-0 flex-col items-end gap-1 ${columnWidth('price_change_pct_24h')}`}>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-2.5 w-10" />
    </span>
  </>
)

/**
 * A whole row, for when even the catalog is still in flight.
 *
 * It replaces a centred spinner. A spinner says "something is happening"; this
 * says what is about to be there, and it says it in the shape the answer will
 * take — so the list does not jump when the answer lands.
 */
export const RowSkeleton = () => (
  <div className="flex w-full items-center gap-3 px-2.5 py-2">
    <span className="w-5 flex-shrink-0" />
    <Skeleton className="size-7 flex-shrink-0 rounded-full" />
    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-2.5 w-24" />
    </span>
    <MarketCellsSkeleton />
  </div>
)

/** Enough to fill the panel, so the placeholder does not end mid-screen. */
const VISIBLE_ROWS = 9

export const ListSkeleton = () => (
  <div className="p-2">
    {Array.from({ length: VISIBLE_ROWS }, (_, index) => (
      <RowSkeleton key={index} />
    ))}
  </div>
)

import { Button, cn } from '@extension/ui'
import { SortCaret } from '@x/components/sort-caret'
import type { MarketRow, MarketsSnapshot } from '@x/services/catalyst'
import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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
  type Sort,
  type SortKey,
} from './markets-table'

/**
 * Every market this token trades at, and what it costs at each one.
 *
 * Laid out like the market list one screen over rather than like a card of its
 * own: the same uppercase column headings, the same twin caret with only the
 * column in force lit, the same rounded row that highlights on hover instead of
 * being fenced by a rule. A reader who has used the Token list already knows
 * how to read and sort this one, and two tables in one panel that sort
 * differently is a worse cost than any pixel here.
 *
 * The prices are reference prices. They come from each market's own reserves,
 * so two rows for one token routinely disagree, which is the entire reason to
 * show them; what a trade fills at is decided at the quote step, which routes
 * across these and may use none of them.
 */

const COLUMNS: ReadonlyArray<{ key: SortKey; label: string; width: string }> = [
  { key: 'price_usd', label: 'Price', width: 'w-[72px]' },
  { key: 'volume_24h_usd', label: 'Vol 24h', width: 'w-[60px]' },
  { key: 'liquidity_usd', label: 'Liquidity', width: 'w-[60px]' },
]

/**
 * A venue with no confirmed mark gets its initial, never somebody else's logo.
 *
 * The upstream answers 200 with a grey placeholder for DEX ids it does not
 * know, so "has a mark" is decided on the server by hashing the body. Manifest
 * is the live example: a real venue with real volume and no artwork anywhere.
 */
const Monogram = ({ venue }: { venue: string }) => (
  <span
    aria-hidden
    className="text-9 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold text-white/70">
    {venue.trim().charAt(0).toUpperCase() || '?'}
  </span>
)

const Mark = ({ venue, logo }: { venue: string; logo: string | undefined }) =>
  logo ? (
    <img src={logo} alt="" aria-hidden className="size-[18px] shrink-0 rounded-full" />
  ) : (
    <Monogram venue={venue} />
  )

const ColumnHeader = ({ sort, onSort }: { sort: Sort; onSort: (key: SortKey) => void }) => (
  <div className="flex items-center gap-2.5 border-b border-white/10 px-2.5 py-1.5">
    <span className="text-10 text-foreground w-4 flex-shrink-0 text-center">#</span>
    <span className="size-[18px] shrink-0" aria-hidden />
    <span className="text-10 text-foreground min-w-0 flex-1 uppercase tracking-wide">Market</span>
    {COLUMNS.map((column) => {
      const active = sort.key === column.key
      return (
        <button
          key={column.key}
          type="button"
          // Not `aria-sort`: that belongs to a `columnheader` inside a real
          // table, and claiming it on a button would claim table semantics the
          // rows below do not have. The market list settled this already.
          aria-pressed={active}
          aria-label={`Sort by ${column.label}${
            active ? `, currently ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''
          }`}
          onClick={() => onSort(column.key)}
          className={cn(
            'text-10 text-foreground flex min-w-0 shrink-0 items-center justify-end gap-0.5 text-right uppercase tracking-wide transition-opacity hover:opacity-80',
            column.width
          )}>
          {column.label}
          <SortCaret active={active} direction={sort.direction} />
        </button>
      )
    })}
    <span className="size-2.5 shrink-0" aria-hidden />
  </div>
)

const Row = ({
  market,
  rank,
  logo,
}: {
  market: MarketRow
  rank: number
  logo: string | undefined
}) => {
  const body = (
    <>
      <span className="text-10 text-foreground w-4 flex-shrink-0 text-center tabular-nums">
        {rank}
      </span>
      <Mark venue={market.venue} logo={logo} />
      <span className="min-w-0 flex-1">
        <span className="text-13 text-foreground block truncate font-medium">{market.venue}</span>
        <span className="text-10 text-muted-foreground block truncate">{market.pair}</span>
      </span>
      {/* `N/A`, not `$0`: an order book has no reserve either directory
          reports, and a zero would say the market is empty when it is merely
          not an AMM. */}
      <span
        className={cn(
          'text-12 text-foreground flex-shrink-0 text-right tabular-nums',
          COLUMNS[0].width
        )}>
        {formatPrice(market.price_usd)}
      </span>
      <span
        className={cn(
          'text-11 text-foreground flex-shrink-0 text-right tabular-nums',
          COLUMNS[1].width
        )}>
        {formatFigure(market.volume_24h_usd)}
      </span>
      <span
        className={cn(
          'text-11 text-foreground flex-shrink-0 text-right tabular-nums',
          COLUMNS[2].width
        )}>
        {formatFigure(market.liquidity_usd)}
      </span>
    </>
  )

  const className =
    'rounded-10 group flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-white/5'
  const href = safeHref(market.url)
  if (!href)
    return (
      <div className={className}>
        {body}
        <span className="size-2.5 shrink-0" aria-hidden />
      </div>
    )

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`${market.venue} ${market.pair} market`}
      className={className}>
      {body}
      <ExternalLink
        aria-hidden
        className="text-muted-foreground/30 group-hover:text-muted-foreground size-2.5 shrink-0"
      />
    </a>
  )
}

const Frame = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="text-12 text-foreground mb-1 font-medium">{title}</div>
    {children}
  </div>
)

export const MarketsCard = ({
  snapshot,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  snapshot: MarketsSnapshot | undefined
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}) => {
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)
  const [expanded, setExpanded] = useState(false)

  // A new token is a new table. Without this, switching issuer kept the
  // previous selection's "show all" open over a shorter list, and kept a sort
  // the reader chose for a different set of markets.
  const identity = `${snapshot?.chain ?? ''}:${snapshot?.token_address ?? ''}`
  useEffect(() => {
    setExpanded(false)
    setSort(DEFAULT_SORT)
  }, [identity])

  const view = summariseMarkets(snapshot)
  const rows = view.kind === 'markets' ? view.rows : undefined
  // Sorted over the whole set, then folded. Folding first would rank five rows
  // and call it a table.
  const sorted = useMemo(() => (rows ? sortMarkets(rows, sort) : []), [rows, sort])

  const title = snapshot?.symbol ? `${snapshot.symbol} markets` : 'Markets'

  if (isLoading && !snapshot) {
    return (
      <Frame title={title}>
        <div className="h-24 animate-pulse rounded-lg bg-white/[0.04]" />
      </Frame>
    )
  }

  if (view.kind === 'unavailable') {
    return (
      <Frame title={title}>
        <p className="text-10 text-muted-foreground leading-relaxed">
          Could not read the market directory just now. This says nothing about whether{' '}
          {view.symbol ?? 'this token'} has a market.
        </p>
        {(onRetry || isError) && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Frame>
    )
  }

  if (view.kind === 'empty') {
    return (
      <Frame title={title}>
        <p className="text-10 text-muted-foreground leading-relaxed">
          No markets found for {view.symbol} on {view.chain === 'bnb' ? 'BNB Chain' : 'Solana'}.
        </p>
      </Frame>
    )
  }

  const visible = visibleMarkets(sorted, expanded)

  return (
    <Frame title={title}>
      <ColumnHeader sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} />

      <div className="pt-0.5">
        {visible.map((market, index) => (
          <Row key={market.id} market={market} rank={index + 1} logo={view.logos[market.dex_id]} />
        ))}
      </div>

      {sorted.length > ROWS_BEFORE_FOLD && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="text-10 text-primary mt-1 px-2.5 hover:underline">
          {expanded ? 'Show fewer' : `Show all ${sorted.length}`}
        </button>
      )}
    </Frame>
  )
}

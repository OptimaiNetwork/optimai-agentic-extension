import { useSupportedTickers } from '@x/queries/catalyst/use-supported-tickers'
import { useMarket } from '@x/queries/catalyst/use-market'
import { formatPercent, formatUsd } from '@x/pages/ticker/format'
import { describeRequestFailure } from '@x/libs/request-error'
import { dynamicPaths } from '@x/routers/paths'
import { useSelection } from '@x/modules/venue'
import { ScrollArea } from '@extension/ui'
import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { MarketSearch } from './market-search'
import { Pagination } from './pagination'
import { ListSkeleton, MarketCellsSkeleton } from './row-skeleton'
import { MarketStats } from './market-stats'
import {
  columnWidth,
  DEFAULT_SORT,
  formatCompactUsd,
  nextSort,
  SORT_COLUMNS,
  sortRows,
} from './sort'
import type { SortChoice, SortColumn, TokenRow } from './sort'
import { Sparkline } from './sparkline'
import { SortCaret } from '@x/components/sort-caret'
import { TokenLogo } from './token-logo'

/**
 * What the panel shows when nobody asked about a particular ticker — the
 * sidebar button opens it here.
 *
 * It used to open a sign-in screen, which was the previous product's front
 * door and said "No features yet." underneath. There is no account in this
 * one: everything except signing a purchase works signed out, so the honest
 * front door is the list of things it can answer for.
 *
 * Laid out like CoinMarketCap's mobile list — rank, logo, name, price, change,
 * and one row of chips that decides the ordering — because that is the shape
 * people already know how to read, and because 77 rows in one column is a
 * directory rather than a market until something ranks them.
 */

/** The server's own ceiling. Asking for more returns this many anyway. */
const PAGE_SIZE = 100

const changeTone = (value: string | null | undefined): string =>
  value == null
    ? 'text-muted-foreground'
    : Number(value) >= 0
      ? 'text-positive'
      : 'text-destructive'

const HeaderCell = ({
  column,
  sort,
  onChange,
}: {
  column: SortColumn
  sort: SortChoice
  onChange: (next: SortChoice) => void
}) => {
  // Which column is in force is said by the caret alone, in the brand colour.
  // Dimming the other three labels said it a second time, and said it worse:
  // a heading at half strength reads as disabled rather than as inactive.
  const active = sort.key === column.key

  return (
    <button
      type="button"
      // Not `aria-sort`: that belongs to a `columnheader` inside a real table,
      // and claiming it on a button would mean claiming table semantics the
      // rows below do not have. `aria-pressed` plus a label that says which way
      // it is sorted describes the control that is actually here.
      aria-pressed={active}
      aria-label={`Sort by ${column.label}${
        active ? `, currently ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''
      }`}
      onClick={() => onChange(nextSort(sort, column))}
      className={`${column.width} ${
        column.align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
      } text-10 text-foreground flex min-w-0 shrink-0 items-center gap-0.5 uppercase tracking-wide transition-opacity hover:opacity-80`}>
      {column.label}
      <SortCaret active={active} direction={sort.direction} />
    </button>
  )
}

const ColumnHeader = ({
  sort,
  onChange,
}: {
  sort: SortChoice
  onChange: (next: SortChoice) => void
}) => (
  <div className="bg-brown sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 px-[18px] py-1.5">
    <span className="text-10 text-foreground w-5 flex-shrink-0 text-center">#</span>
    {/* No spacer for the logo column. The heading used to start where
        the *name* starts, which is correct about the text and wrong
        about the column: the logo is part of the asset, so leaving it
        unheaded opened a 40px hole between `#` and `ASSET` and read as
        a misalignment. The heading now begins at the logo and still
        ends flush with the name, because that column is the flexible
        one and the fixed columns to its right do not move. */}
    {SORT_COLUMNS.map((column) => (
      <HeaderCell key={column.key} column={column} sort={sort} onChange={onChange} />
    ))}
  </div>
)

const Row = ({
  row,
  rank,
  pending,
  onOpen,
}: {
  row: TokenRow
  rank: number
  pending: boolean
  onOpen: () => void
}) => {
  const { token, market } = row
  const price = market?.reference_price
  const change = market?.price_change_pct_24h

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-10 group flex w-full items-center gap-3 px-2.5 py-2 text-left transition-colors hover:bg-white/5">
      <span className="text-10 text-foreground w-5 flex-shrink-0 text-center tabular-nums">
        {rank}
      </span>
      <TokenLogo token={token} />

      <span className="min-w-0 flex-1">
        {/* The on-chain symbol, not the listed ticker. This row is a token on
            BNB Chain — CRCLB is the thing with a price, a supply and a contract
            behind it; CRCL is the share it tracks on an exchange we do not
            quote. Search still matches either, and the cashtag that brought
            somebody here already said $CRCL. */}
        <span className="text-13 text-foreground block truncate font-medium">{token.symbol}</span>
        <span className="text-10 text-muted-foreground block truncate">
          {token.name ?? token.ticker}
        </span>
      </span>

      {market ? (
        <>
          <span
            className={`text-11 text-foreground flex-shrink-0 text-right tabular-nums ${columnWidth('market_cap')}`}>
            {formatCompactUsd(market?.market_cap)}
          </span>

          <span
            className={`text-12 text-foreground flex-shrink-0 text-right tabular-nums ${columnWidth('reference_price')}`}>
            {price != null ? formatUsd(price) : pending ? '…' : '—'}
          </span>

          <span
            className={`flex flex-shrink-0 flex-col items-end ${columnWidth('price_change_pct_24h')}`}>
            <Sparkline values={market?.sparkline} positive={Number(change ?? 0) >= 0} />
            <span className={`text-10 block tabular-nums ${changeTone(change)}`}>
              {formatPercent(change)}
            </span>
          </span>
        </>
      ) : (
        // Not `…` in the price column and a hole where the line goes: until the
        // candles are here there is no chart to show, so the row shows the shape
        // of one instead.
        <MarketCellsSkeleton />
      )}
    </button>
  )
}

const HomePage = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortChoice>(DEFAULT_SORT)
  const deferredQuery = useDeferredValue(query.trim().replace(/^\$/, '').toUpperCase())
  const selection = useSelection()
  // Search is server-side. This matters for Ondo: the first page contains the
  // top 100 by company market cap, but a lower-ranked ticker must still be
  // discoverable without downloading and filtering the whole catalog in the UI.
  const { data, isLoading, isError, error } = useSupportedTickers(deferredQuery, page)
  const failure = describeRequestFailure(error)
  const market = useMarket(deferredQuery, PAGE_SIZE, sort, page)

  // A search, an issuer or a sort is a different list, and page four of the old
  // one is not a position in the new one. Going back to the first page is the
  // only answer that is always right.
  const listIdentity = `${selection.venue}:${selection.chain}:${deferredQuery}:${sort.key}:${sort.direction}`
  const seenIdentity = useRef(listIdentity)
  if (seenIdentity.current !== listIdentity) {
    seenIdentity.current = listIdentity
    if (page !== 1) setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  const marketByTicker = useMemo(
    () => new Map((market.data?.items ?? []).map((item) => [item.ticker, item])),
    [market.data]
  )

  const rows = useMemo(() => {
    const tokens = data?.tokens ?? []
    return sortRows(
      tokens.map((token) => ({ token, market: marketByTicker.get(token.ticker) })),
      sort
    )
  }, [data, marketByTicker, sort])

  const pending = market.isFetching && !market.isError

  return (
    <div className="bg-brown/90 flex h-full w-full flex-col border-l border-white/10 shadow-2xl backdrop-blur-lg">
      <div className="flex-shrink-0 border-b border-white/10 px-3 pb-2.5 pt-2.5">
        {/* The page names itself. It did not have to while a tab bar sat above
            saying "Token", but navigation is a menu now — which is closed most
            of the time, and closed it says nothing about where you are. */}
        {/* `relative` so the field can be positioned against this row rather
            than against the button it slides out from — that is what lets its
            width be a share of the row. */}
        <div className="relative flex min-h-7 items-center gap-1.5">
          <h1 className="text-20 text-foreground font-semibold leading-none tracking-tight">
            Market
          </h1>
          <MarketSearch query={query} onQuery={setQuery} />
        </div>

        <div className="mt-2.5">
          <MarketStats
            totals={market.data?.totals}
            market={market.data?.market}
            pending={!market.data}
          />
        </div>
      </div>

      <ScrollArea className="w-full flex-1">
        {/* The column header belongs to the list's shape, not to its data, so it
            is here while the skeleton is. Revealing it only once the rows land
            pushed all of them down by its own height — which is precisely the
            jump a skeleton exists to prevent. */}
        {(isLoading || (data && rows.length > 0)) && (
          <ColumnHeader sort={sort} onChange={setSort} />
        )}

        {isLoading && <ListSkeleton />}

        {/* The error itself, never a way to fix it. This block used to print
            `cd server && uv run uvicorn …` whenever the call failed to
            connect — a command guessed at the reader's machine, standing
            where the reason belonged. */}
        {isError && (
          <div className="space-y-2 p-4">
            <p className="text-12 text-foreground">{failure.title}</p>
            <code className="text-10 rounded-10 text-foreground/80 block bg-black/40 p-2">
              {failure.detail}
            </code>
            <p className="text-11 text-muted-foreground leading-relaxed">
              Until it answers, the buttons on posts and the card on a search page are gone too —
              the catalog is what decides which cashtags are ours, so nothing renders without it.
            </p>
          </div>
        )}

        {data && rows.length === 0 && (
          <p className="text-11 text-muted-foreground p-4 leading-relaxed">
            Nothing matching {query.trim().toUpperCase()} in {selection.venue}.
          </p>
        )}

        {data && rows.length > 0 && (
          <>
            <div className="p-2">
              {rows.map((row, index) => (
                <Row
                  key={row.token.symbol}
                  row={row}
                  rank={(page - 1) * PAGE_SIZE + index + 1}
                  pending={pending}
                  onOpen={() =>
                    navigate(dynamicPaths.ticker(row.token.ticker), {
                      state: { venue: selection.venue, chain: selection.chain },
                    })
                  }
                />
              ))}
            </div>
          </>
        )}
        {data && rows.length > 0 && (
          <Pagination page={page} pageCount={pageCount} onPage={setPage} />
        )}
      </ScrollArea>
    </div>
  )
}

export default HomePage

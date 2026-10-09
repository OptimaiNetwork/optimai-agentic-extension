import { Skeleton } from '@extension/ui'
import type { MarketStatus, MarketTotals } from '@x/services/catalyst'

import { formatCompactUsd } from './sort'

/**
 * Three cards that frame the list, read from the server rather than added up
 * here.
 *
 * Summing the rows on screen made the totals follow the page and the search: a
 * ticker typed into the box redefined "market cap" as that one company's, and
 * a total that moves when you filter is not a total. It was worse than
 * inconsistent on Ondo, where the row's `market_cap` was the *company's* — so
 * the header read $60.59T above a list of tokens worth $331.67M.
 */

/**
 * A figure the venue does not publish — Ondo's 24h volume, once it has been
 * asked for and come back empty.
 *
 * Deliberately not what a card shows while loading. A dash is a claim: it says
 * there is no such number. Switching issuer throws all three figures away and
 * the next ones are a request away, which is a different thing and gets the
 * placeholder instead.
 */
const HAS_NO_FIGURE = '—'

/** About where these values land, so the swap barely moves anything. */
const PLACEHOLDER_WIDTH = 'w-20'

const Card = ({ label, value, pending }: { label: string; value: string; pending: boolean }) => (
  <div className="rounded-10 min-w-0 flex-1 bg-white/[0.04] px-2.5 py-2">
    <div className="text-10 text-muted-foreground truncate">{label}</div>
    {pending ? (
      // Sized and spaced to occupy the line the figure will, so the card keeps
      // its height and the row below it does not jump.
      <Skeleton className={`mt-1.5 h-4 ${PLACEHOLDER_WIDTH}`} />
    ) : (
      <div className="text-16 text-foreground mt-1 truncate font-semibold tabular-nums">
        {value}
      </div>
    )}
  </div>
)

export const MarketStats = ({
  totals,
  market,
  pending,
}: {
  totals: MarketTotals | undefined
  market: MarketStatus | undefined
  /** Nothing has come back yet — switching issuer throws all three away. */
  pending: boolean
}) => (
  <div className="flex items-stretch gap-1.5">
    <Card
      label="Market cap"
      pending={pending}
      value={totals?.market_cap ? formatCompactUsd(totals.market_cap) : HAS_NO_FIGURE}
    />
    <Card
      label="24h volume"
      pending={pending}
      value={totals?.volume_24h ? formatCompactUsd(totals.volume_24h) : HAS_NO_FIGURE}
    />
    <Card
      label="US market"
      pending={pending}
      value={market ? (market.is_open ? 'Open' : 'Closed') : HAS_NO_FIGURE}
    />
  </div>
)

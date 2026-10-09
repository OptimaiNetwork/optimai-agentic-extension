import { venueDescriptor } from '@extension/shared'
import type { ChainId } from '@extension/shared'
import { Chart } from '@x/modules/search-card/chart'
import {
  formatCompactUsd,
  formatCount,
  isDarkPage,
  TickerPopoverView,
  usePopoverPosition,
} from '@x/modules/ticker-popover'
import { formatPercent, formatUsd } from '@x/pages/ticker/format'
import { useMemo, useRef } from 'react'

import { openTradePanel } from '../trade/store'
import type { TradeScreen } from '../trade/store'
import { useHoverCard } from './queries'
import type { HoverCard, Listing } from '../services/types'

/** Price row, chart, stats and the action row, before the card has been measured. */
const FALLBACK_HEIGHT = 470
const CHART_HEIGHT = 156
/** Fewer candles than this is a dot, not a line. */
const MIN_CANDLES = 2

interface WebTickerPopoverProps {
  ticker: string
  listing: Listing
  /** The chains this listing's issuer has the ticker on, for the trade panel's switch. */
  chains: readonly ChainId[]
  /** What the lexicon calls the company, shown until the card arrives. */
  name: string | undefined
  trigger: HTMLElement
  onPointerEnter: () => void
  onPointerLeave: () => void
  onClose: () => void
}

const statsFor = (card: HoverCard) => [
  { label: '24h volume', value: formatCompactUsd(card.quote.volume_24h) },
  { label: 'Market cap', value: formatCompactUsd(card.quote.market_cap) },
  {
    label: 'Underlying session',
    value: card.market ? (card.market.is_open ? 'Open' : 'Closed') : '—',
  },
  // A fourth cell so the grid closes: holders where the listing publishes them,
  // otherwise the multiplier, which is what turns a token price into a share price.
  card.quote.holders != null
    ? { label: 'Holders', value: formatCount(card.quote.holders) }
    : {
        label: 'Multiplier',
        value: card.quote.multiplier ? Number(card.quote.multiplier).toFixed(4) : '—',
      },
]

/**
 * The card for one highlighted word on a page that is not X.
 *
 * The same card as on X, drawn by the same view, with two differences: a day of
 * hourly candles sits under the price, and there is no agent on these pages, so
 * the heading is a label and Ask is left out. Where X has Ask, this card has
 * View token: both buttons slide in the page's trade panel (`../trade`) on this
 * token, View token on the token page and Trade on the order form.
 */
export const WebTickerPopover = ({
  ticker,
  listing,
  chains,
  name,
  trigger,
  onPointerEnter,
  onPointerLeave,
  onClose,
}: WebTickerPopoverProps) => {
  const card = useHoverCard(ticker, listing, true)
  const popover = useRef<HTMLDivElement>(null)
  const position = usePopoverPosition(trigger, popover, {
    fallbackHeight: FALLBACK_HEIGHT,
    onLost: onClose,
  })
  const dark = useMemo(isDarkPage, [])
  const data = card.data
  const descriptor = venueDescriptor(listing.venue, listing.chain)
  const chainLabel = listing.chain === 'solana' ? 'Solana' : 'BNB Chain'
  const subtitle = data
    ? `${data.token.name ?? ticker} · ${data.token.venue_label} · ${data.token.chain_label}`
    : `${name ?? ticker} · ${descriptor.label} · ${chainLabel}`

  const openPanel = (screen: TradeScreen) => {
    openTradePanel({
      ticker,
      chain: listing.chain,
      venue: listing.venue,
      chains,
      screen,
      symbol: data?.token.symbol,
      name: data?.token.name ?? name,
    })
    onClose()
  }

  const chart = data ? (
    data.candles.length >= MIN_CANDLES ? (
      <div className="catalyst-ticker-popover-chart">
        {/* The card's own theme, not the page's guess at it: a transparent body
            read as black and drew white axes on a white card. */}
        <Chart candles={data.candles} height={CHART_HEIGHT} dark={dark} />
      </div>
    ) : (
      <div className="catalyst-ticker-popover-chart-empty" role="note">
        {data.unavailable.candles ? 'The chart could not be loaded.' : 'No trades in the last day.'}
      </div>
    )
  ) : null

  return (
    <TickerPopoverView
      ref={popover}
      symbol={data?.token.symbol ?? ticker}
      subtitle={subtitle}
      logo={data?.token.logo}
      chain={listing.chain}
      dark={dark}
      price={
        data
          ? {
              value: formatUsd(data.quote.reference_price),
              change: formatPercent(data.quote.price_change_pct_24h),
              down: Number(data.quote.price_change_pct_24h ?? 0) < 0,
            }
          : null
      }
      stats={data ? statsFor(data) : null}
      status={card.isError ? 'Market details are unavailable right now.' : 'Loading market data…'}
      chart={chart}
      wide
      actions={[
        { name: 'view', label: 'View token', onClick: () => openPanel('token') },
        { name: 'trade', label: 'Trade now', primary: true, onClick: () => openPanel('buy') },
      ]}
      onClose={onClose}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        maxHeight: position?.maxHeight,
        visibility: position ? 'visible' : 'hidden',
      }}
    />
  )
}

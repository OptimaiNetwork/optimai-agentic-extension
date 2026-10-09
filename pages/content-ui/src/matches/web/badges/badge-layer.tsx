import { useQuery } from '@tanstack/react-query'
import { TokenLogo } from '@x/modules/ticker-popover'
import { formatUsd } from '@x/pages/ticker/format'
import { createPortal } from 'react-dom'

import { hoverQuery } from '../hover/queries'
import { listingChains } from '../lexicon/listing'
import { openTradePanel } from '../trade/store'
import { usePageBadges } from './store'
import { useSeen } from './use-seen'
import type { Lexicon } from '../services/types'
import type { PageBadge } from './store'

/**
 * The X tweet pill, after a mention on any other page: logo, symbol, price.
 *
 * The same markup and classes as `MarketPill` in the tweet injection, so the
 * shared `pill.css` draws it; only its size is the badge's own (`badge.css`).
 * The symbol is the lexicon's and shows at once; logo and price come with the
 * mention's card, fetched when the badge nears the viewport — the same query
 * the hover card reads, so hovering a badge that has a price opens at once.
 *
 * Hovering opens the card (`../hover`); pressing opens the token page in the
 * trade panel, the way pressing the pill on X opens the panel's read.
 */
const MarketBadge = ({ badge, lexicon }: { badge: PageBadge; lexicon: Lexicon }) => {
  const { ticker, listing } = badge
  const seen = useSeen(badge.host)
  const card = useQuery({ ...hoverQuery(ticker, listing), enabled: seen })
  const symbol = card.data?.token.symbol ?? listing.symbol
  const price = card.data?.quote.reference_price ? formatUsd(card.data.quote.reference_price) : null

  return (
    <button
      type="button"
      className="catalyst-tweet-market-pill"
      // No `title`: its tooltip drew over the card that opens on the same hover.
      aria-label={`Market details for ${symbol}${price ? `, ${price}` : ''}`}
      aria-haspopup="dialog"
      onClick={(event) => {
        // A badge can sit inside a link that is a whole card; it must not follow it.
        event.preventDefault()
        event.stopPropagation()
        openTradePanel({
          ticker,
          chain: listing.chain,
          venue: listing.venue,
          chains: listingChains(ticker, lexicon, listing.venue),
          screen: 'token',
          symbol,
          name: card.data?.token.name ?? lexicon.names[ticker],
        })
      }}>
      <TokenLogo logo={card.data?.token.logo} symbol={symbol} chain={listing.chain} />
      <span className="catalyst-tweet-market-symbol">{symbol}</span>
      {price ? <span className="catalyst-tweet-market-price">{price}</span> : null}
    </button>
  )
}

/**
 * Every badge on the page, each rendered into its own shadow root by a portal
 * from the one React root the page has — one query cache, one trade panel.
 */
export const BadgeLayer = ({ lexicon }: { lexicon: Lexicon }) => {
  const badges = usePageBadges()
  return (
    <>
      {badges.map((badge) =>
        createPortal(<MarketBadge badge={badge} lexicon={lexicon} />, badge.mount, badge.id)
      )}
    </>
  )
}

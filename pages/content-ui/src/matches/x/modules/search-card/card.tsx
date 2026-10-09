import { OPEN_PANEL_EVENT, type OpenPanelDetail } from '@/matches/x/layouts/global-layout'
import { useCandles } from '@x/queries/catalyst/use-candles'
import { useQuote } from '@x/queries/catalyst/use-quote'
import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'
import { formatUsd } from '@x/pages/ticker/format'
import { useSelection } from '@x/modules/venue'
import { isVenueId, VENUES } from '@extension/shared'
import { NamespaceMark } from '@x/modules/wallet/marks'
import { useState } from 'react'

import { Chart } from './chart'
import { closedWindowOf } from './closed-window'

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/**
 * Our card, rendered above X's own on a cashtag search page.
 *
 * It does not touch X's card. It answers the question X's card leaves open: that
 * one is priced on whichever chain the asset happens to live on — for `$TSLAx`
 * it shows a Solana mint — and it stops at the closing bell. This one is BNB
 * Chain, and it keeps going.
 *
 * Plain class names throughout, not Tailwind utilities. This mounts into X's
 * light DOM; the compiled Tailwind is adopted into the panel's shadow root and
 * reaches nothing outside it. Every utility here used to match no rule at all,
 * so on the real site the card was unstyled stacked text with a black chart.
 * The styles live in `styles/tweets.css` and inherit X's colour so the card
 * follows whichever theme they are in.
 */
export const SearchCard = ({ ticker, cashtag }: { ticker: string; cashtag?: string }) => {
  const activeSelection = useSelection()
  // `$NVDAon` names Ondo, while the selected chain determines which of Ondo's
  // listings to read. Other cashtags follow the panel's current issuer.
  const isOndoCashtag = /on$/i.test(cashtag ?? '')
  const selection = isOndoCashtag
    ? { venue: 'ondo' as const, chain: activeSelection.chain }
    : activeSelection
  const quote = useQuote(ticker, { selection })
  // Four days, not two. A weekend closure runs about 65 hours, and a 48-hour
  // window cannot see its start — which meant either understating it as "shut
  // for 48 hours" or, once that was guarded, saying nothing at all on exactly
  // the days the claim is worth making.
  const candles = useCandles(ticker, '1h', 96, selection)
  // What is drawn: the last 24 hours in 5-minute candles. The hourly series
  // above is only for the closed-window sentence, which needs the longer tail.
  const line = useCandles(ticker, '5m', 288, selection)

  const closed = candles.data ? closedWindowOf(candles.data.candles) : null
  const chainLabel = quote.data?.chain === 'solana' ? 'Solana' : 'BNB Chain'
  const issuer = quote.data?.issuer ?? quote.data?.provider
  const venueLabel = issuer
    ? isVenueId(issuer)
      ? VENUES[issuer].label
      : issuer
    : 'OptimAI Agentic'
  // The same resolve the ticker page runs, so the logo is one cached request.
  const token = useResolveCashtag(ticker, { selection }).data
  const open = (view: OpenPanelDetail['view']) =>
    document.dispatchEvent(
      new CustomEvent<OpenPanelDetail>(OPEN_PANEL_EVENT, {
        detail: {
          ticker,
          view,
          venue: isOndoCashtag ? 'ondo' : undefined,
          chain: isOndoCashtag ? activeSelection.chain : undefined,
        },
      })
    )

  // Only once a quote has named a market. Offering a trade before we know
  // there is one is how a button promises a screen that opens on an error.
  const tradable = quote.data
    ? quote.data.trade_capability
      ? quote.data.trade_capability.status === 'available'
      : quote.data.tradability !== 'unavailable'
    : false

  if (quote.isError) return null

  return (
    <div className="catalyst-search-card">
      <div className="catalyst-search-card-head">
        {/* The identity is the door to the full read: logo and title together
            are one button, so the eye's first stop on the card is also the
            way in. */}
        <button
          type="button"
          onClick={() => open('read')}
          title="Open the full read"
          aria-label={`Open the full read for ${quote.data?.symbol ?? ticker}`}
          className="catalyst-search-card-identity">
          <TokenLogo
            logo={token?.logo}
            symbol={quote.data?.symbol ?? ticker}
            chain={token?.chain ?? selection.chain}
          />
          <span className="catalyst-search-card-title">
            <span className="catalyst-search-card-symbol">
              {quote.data?.symbol ?? ticker} on {chainLabel}
            </span>
            <span className="catalyst-search-card-sub">
              {quote.data ? `${venueLabel} · trades 24/7` : 'loading'}
            </span>
          </span>
        </button>
        {quote.data && (
          <div className="catalyst-search-card-price-wrap">
            <div className="catalyst-search-card-price">
              {formatUsd(quote.data.reference_price)}
            </div>
            <div className="catalyst-search-card-note-small">per share, multiplier applied</div>
          </div>
        )}
      </div>

      {line.data && line.data.candles.length > 1 && (
        <div className="catalyst-search-card-chart">
          <Chart candles={line.data.candles} />
        </div>
      )}

      {closed && closed.hours >= 2 && (
        <p className="catalyst-search-card-note">
          The US market has been shut for {closed.hours} hours. In that time{' '}
          {quote.data?.symbol ?? ticker} traded between {formatUsd(String(closed.low))} and{' '}
          {formatUsd(String(closed.high))} — a {closed.rangePercent.toFixed(1)}% range,{' '}
          {closed.netPercent >= 0 ? '+' : ''}
          {closed.netPercent.toFixed(2)}% net
          {/* Binance's Ondo candles carry no volume at all; "on 0 of volume"
              would say nobody traded, which is not what that zero means. */}
          {closed.volume > 0 ? `, on ${compact.format(closed.volume)} of volume` : ''}. X's own card
          draws that as a flat line.
        </p>
      )}

      <div className="catalyst-search-card-actions">
        {/* Ask, not read: the read is one click on the title above, and the
            question a search page raises is "what is being said", which is
            the agent's door. */}
        <button type="button" onClick={() => open('ask')} className="catalyst-search-card-cta">
          Ask about {quote.data?.symbol ?? ticker}
        </button>
        {/* The second door. The read answers what happened; this one is the
            reason the card is on a trading site at all, so it lands on the buy
            screen for the same token rather than making the user find it. */}
        <button
          type="button"
          onClick={() => open('trade')}
          disabled={!tradable}
          title={tradable ? undefined : 'No executable market for this token'}
          className="catalyst-search-card-cta catalyst-search-card-cta-trade">
          Trade
        </button>
      </div>
    </div>
  )
}

/** The token's logo, or its first two letters while the brand has not resolved. */
const TokenLogo = ({
  logo,
  symbol,
  chain,
}: {
  logo?: string | null
  symbol: string
  chain: 'solana' | 'bnb'
}) => {
  const [failed, setFailed] = useState(false)
  return (
    <span className="catalyst-search-card-logo-wrap">
      {!logo || failed ? (
        <span className="catalyst-search-card-logo" aria-hidden="true">
          {symbol.slice(0, 2)}
        </span>
      ) : (
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          decoding="async"
          onError={() => setFailed(true)}
          className="catalyst-search-card-logo"
        />
      )}
      <span
        className="catalyst-search-card-chain-badge"
        role="img"
        aria-label={chain === 'solana' ? 'Solana' : 'BNB Chain'}>
        <NamespaceMark
          namespace={chain === 'solana' ? 'svm' : 'evm'}
          className="catalyst-chain-mark"
        />
      </span>
    </span>
  )
}

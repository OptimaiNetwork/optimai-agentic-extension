import { getSelection, useSelection, venueDescriptor } from '@x/modules/venue'
import { resolveLocally, type SupportedTickers } from '@x/queries/catalyst/use-supported-tickers'
import { useMarket } from '@x/queries/catalyst/use-market'
import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'
import { useQuote } from '@x/queries/catalyst/use-quote'
import { formatPercent, formatUsd } from '@x/pages/ticker/format'
import type { StockMarketItem } from '@x/services/catalyst'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'

import { OPEN_PANEL_EVENT, type OpenPanelDetail } from '@/matches/x/layouts/global-layout'
import {
  formatCompactUsd,
  formatCount,
  isDarkPage,
  TickerPopoverView,
  TokenLogo,
  usePopoverPosition,
} from '@x/modules/ticker-popover'
import { cashtagLinksIn, cashtagOfAnchor } from './cashtags'

interface TweetButtonProps {
  /** Underlying tickers resolved from the tweet's own cashtags. */
  tickers: string[]
  tweetId: string | null
  tweet: Element
  supported: SupportedTickers
}

interface HoverTarget {
  ticker: string
  trigger: HTMLElement
}

const CASHTAG_LINK = 'a[href*="=cashtag_click"]'
const QUOTED_TWEET = '[data-testid="quotedTweet"]'
/** How long the pointer has to rest before the card opens. A pass across
 *  the timeline should not flash a card on every pill it crosses. */
const OPEN_DELAY_MS = 300
/** How long the card survives the pointer leaving, so it can be reached. */
const HOVER_DELAY_MS = 180
/** How many pills a tweet shows before the rest fold behind "N Tokens". */
const VISIBLE_PILLS = 2
/** The card's height before it has been measured: price row, stats, actions. */
const POPOVER_FALLBACK_HEIGHT = 244

/**
 * A row of market pills above the tweet copy, drawn the way Binance Wallet
 * draws its own row on the same tweets: logo, symbol, price, nothing else.
 * Two pills, then the rest fold behind a "N Tokens" pill so a post naming six
 * tickers does not push its own text below the fold.
 *
 * Prices come from the market list, one request for the whole catalog that
 * every pill on the timeline shares. Logos come from the same resolve query
 * the ticker page runs — cached per ticker for fifteen minutes, so a timeline
 * full of $NVDA costs one request and the panel opens on a warm cache. The
 * names lookup the injection holds carries no logos on purpose: it is 14kB
 * where the catalog with its inline images is megabytes.
 */
export const TweetButton = ({ tickers, tweetId, tweet, supported }: TweetButtonProps) => {
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null)
  const [expanded, setExpanded] = useState(false)
  const hoverTargetRef = useRef<HoverTarget | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const market = useMarket()

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])

  const cancelOpen = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current)
    openTimer.current = null
  }, [])

  const showPopover = useCallback(
    (ticker: string, trigger: HTMLElement) => {
      cancelClose()
      cancelOpen()
      const current = hoverTargetRef.current
      if (current?.ticker === ticker && current.trigger === trigger) return
      // A card already open moves to the new pill at once; only the first
      // open waits, so hopping between pills does not stutter.
      const delay = current ? 0 : OPEN_DELAY_MS
      openTimer.current = setTimeout(() => {
        openTimer.current = null
        const next = { ticker, trigger }
        hoverTargetRef.current = next
        setHoverTarget(next)
      }, delay)
    },
    [cancelClose, cancelOpen]
  )

  const closePopoverSoon = useCallback(() => {
    cancelClose()
    cancelOpen()
    closeTimer.current = setTimeout(() => {
      hoverTargetRef.current = null
      setHoverTarget(null)
      closeTimer.current = null
    }, HOVER_DELAY_MS)
  }, [cancelClose, cancelOpen])

  useEffect(() => {
    const eligible = new Set(tickers)

    for (const anchor of cashtagLinksIn(tweet)) {
      const raw = cashtagOfAnchor(anchor)
      const ticker = raw ? resolveLocally(raw, supported) : null
      if (ticker && eligible.has(ticker)) anchor.classList.add('catalyst-market-cashtag')
    }

    const anchorOf = (event: Event): HTMLAnchorElement | null => {
      const target =
        event.target instanceof Element
          ? event.target
          : event.target instanceof Node
            ? event.target.parentElement
            : null
      const anchor = target?.closest<HTMLAnchorElement>(CASHTAG_LINK) ?? null
      if (!anchor || !tweet.contains(anchor) || anchor.closest(QUOTED_TWEET)) return null
      return anchor
    }

    // `Event`, not `PointerEvent`: `Element.addEventListener` is typed against
    // `ElementEventMap`, which has no pointer entries.
    const onPointerOver = (event: Event) => {
      const anchor = anchorOf(event)
      if (!anchor) return
      const raw = cashtagOfAnchor(anchor)
      const ticker = raw ? resolveLocally(raw, supported) : null
      if (ticker && eligible.has(ticker)) {
        anchor.classList.add('catalyst-market-cashtag')
        showPopover(ticker, anchor)
      }
    }

    const onPointerOut = (event: Event) => {
      const anchor = anchorOf(event)
      if (!anchor) return
      const related = (event as PointerEvent).relatedTarget
      if (related instanceof Node && anchor.contains(related)) return
      closePopoverSoon()
    }

    tweet.addEventListener('pointerover', onPointerOver)
    tweet.addEventListener('pointerout', onPointerOut)

    return () => {
      tweet.removeEventListener('pointerover', onPointerOver)
      tweet.removeEventListener('pointerout', onPointerOut)
      for (const anchor of cashtagLinksIn(tweet)) {
        anchor.classList.remove('catalyst-market-cashtag')
      }
      cancelClose()
      cancelOpen()
      hoverTargetRef.current = null
    }
  }, [cancelClose, cancelOpen, closePopoverSoon, showPopover, supported, tickers, tweet])

  const openPanel = useCallback(
    (ticker: string, view: OpenPanelDetail['view']) => {
      const { venue, chain } = getSelection()
      document.dispatchEvent(
        new CustomEvent<OpenPanelDetail>(OPEN_PANEL_EVENT, {
          detail: { ticker, tweetId: tweetId ?? undefined, venue, chain, view },
        })
      )
      hoverTargetRef.current = null
      setHoverTarget(null)
    },
    [tweetId]
  )

  const shown = expanded ? tickers : tickers.slice(0, VISIBLE_PILLS)
  const hidden = tickers.length - shown.length

  return (
    <div className="catalyst-tweet-injection-row">
      {shown.map((ticker) => (
        <MarketPill
          key={ticker}
          ticker={ticker}
          item={itemFor(ticker, market.data?.items)}
          onPointerEnter={(trigger) => showPopover(ticker, trigger)}
          onPointerLeave={closePopoverSoon}
          onOpen={(view) => openPanel(ticker, view)}
        />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          className="catalyst-tweet-market-pill catalyst-tweet-market-more"
          aria-expanded={false}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setExpanded(true)
          }}>
          <span className="catalyst-tweet-market-symbol">{tickers.length} Tokens</span>
          <span className="catalyst-tweet-market-chevron" aria-hidden="true" />
        </button>
      )}
      {hoverTarget
        ? createPortal(
            <TickerPopover
              ticker={hoverTarget.ticker}
              trigger={hoverTarget.trigger}
              onPointerEnter={cancelClose}
              onPointerLeave={closePopoverSoon}
              onOpen={(view) => openPanel(hoverTarget.ticker, view)}
            />,
            document.body
          )
        : null}
    </div>
  )
}

const itemFor = (
  ticker: string,
  items: StockMarketItem[] | undefined
): StockMarketItem | undefined => items?.find((item) => item.ticker.toUpperCase() === ticker)

function MarketPill({
  ticker,
  item,
  onPointerEnter,
  onPointerLeave,
  onOpen,
}: {
  ticker: string
  item: StockMarketItem | undefined
  onPointerEnter: (trigger: HTMLElement) => void
  onPointerLeave: () => void
  onOpen: (view: OpenPanelDetail['view']) => void
}) {
  const token = useResolveCashtag(ticker).data
  const selection = useSelection()
  const symbol = item?.symbol ?? token?.symbol ?? ticker
  const price = item?.reference_price ? formatUsd(item.reference_price) : null

  return (
    <button
      type="button"
      className="catalyst-tweet-market-pill"
      title={price ? `${symbol} · ${price}` : `Market details for ${symbol}`}
      aria-label={`Market details for ${symbol}${price ? `, ${price}` : ''}`}
      aria-haspopup="dialog"
      onPointerEnter={(event) => onPointerEnter(event.currentTarget)}
      onPointerLeave={onPointerLeave}
      onFocus={(event) => onPointerEnter(event.currentTarget)}
      onBlur={onPointerLeave}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpen('read')
      }}>
      <TokenLogo logo={token?.logo} symbol={symbol} chain={token?.chain ?? selection.chain} />
      <span className="catalyst-tweet-market-symbol">{symbol}</span>
      {price ? <span className="catalyst-tweet-market-price">{price}</span> : null}
    </button>
  )
}

/**
 * The hover card. Its title is the way into the full read; the two buttons
 * are the two things a reader does next — ask the agent about it, or trade.
 */
function TickerPopover({
  ticker,
  trigger,
  onPointerEnter,
  onPointerLeave,
  onOpen,
}: {
  ticker: string
  trigger: HTMLElement
  onPointerEnter: () => void
  onPointerLeave: () => void
  onOpen: (view: OpenPanelDetail['view']) => void
}) {
  const quote = useQuote(ticker, { active: true })
  const token = useResolveCashtag(ticker).data
  const selection = useSelection()
  const popover = useRef<HTMLDivElement>(null)
  const position = usePopoverPosition(trigger, popover, {
    fallbackHeight: POPOVER_FALLBACK_HEIGHT,
    onLost: onPointerLeave,
  })
  const venue = quote.data?.issuer ?? selection.venue
  const chain = quote.data?.chain ?? selection.chain
  const venueLabel = venueDescriptor(venue, chain).label
  const symbol = quote.data?.symbol ?? token?.symbol ?? ticker
  const tradeAvailable = quote.data
    ? quote.data.trade_capability
      ? quote.data.trade_capability.status === 'available'
      : quote.data.tradability !== 'unavailable'
    : false

  return (
    <TickerPopoverView
      ref={popover}
      symbol={symbol}
      subtitle={`${token?.underlying_name ?? quote.data?.underlying_name ?? ticker} · ${venueLabel} · ${chain === 'solana' ? 'Solana' : 'BNB Chain'}`}
      logo={token?.logo}
      chain={chain}
      dark={isDarkPage()}
      price={
        quote.data
          ? {
              value: formatUsd(quote.data.reference_price),
              change: formatPercent(quote.data.price_change_pct_24h),
              down: Number(quote.data.price_change_pct_24h ?? 0) < 0,
            }
          : null
      }
      stats={
        quote.data
          ? [
              { label: '24h volume', value: formatCompactUsd(quote.data.volume_24h) },
              { label: 'Market cap', value: formatCompactUsd(quote.data.market_cap) },
              { label: 'Underlying session', value: quote.data.market.is_open ? 'Open' : 'Closed' },
              // A fourth cell so the grid closes. Holders where the venue
              // publishes them; bStocks does not, so the multiplier stands in.
              quote.data.binance_holders != null
                ? { label: 'Holders', value: formatCount(quote.data.binance_holders) }
                : { label: 'Multiplier', value: Number(quote.data.multiplier).toFixed(4) },
            ]
          : null
      }
      status={quote.isError ? 'Market details are unavailable.' : 'Loading market data…'}
      actions={[
        { name: 'ask', label: `Ask about ${symbol}`, onClick: () => onOpen('ask') },
        {
          name: 'trade',
          label: 'Trade now',
          primary: true,
          disabled: !tradeAvailable,
          title:
            quote.data && !tradeAvailable
              ? (quote.data.trade_capability?.reason ?? 'No executable market for this token')
              : undefined,
          onClick: () => onOpen('trade'),
        },
      ]}
      onHeadingClick={() => onOpen('read')}
      onClose={onPointerLeave}
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

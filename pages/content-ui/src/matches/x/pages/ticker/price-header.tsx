import type { StockQuote, StockToken } from '@x/services/catalyst'
import { TokenLogo } from '@x/pages/home/token-logo'
import { Button, cn } from '@extension/ui'
import { ArrowLeft } from 'lucide-react'

import { useSelectedChain } from '@/matches/x/modules/venue'
import { formatPercent, formatUsd } from './format'

/**
 * What the page opens with: which token, what it costs, which way it moved.
 *
 * Laid out the way a market app opens a coin — logo and symbol on one line, the
 * price large enough to read at a glance, and the change as a coloured pill
 * beside it rather than as a third grey number underneath. The old header put
 * the price inside a bordered card below a row of labels, which made the one
 * thing everybody came for compete with a tradability badge.
 */
export const PriceHeader = ({
  quote,
  token,
  onBack,
  onBuy,
}: {
  quote: StockQuote
  token?: StockToken
  /** Left out where nothing sits behind the page, as in the trade panel off X. */
  onBack?: () => void
  onBuy: () => void
}) => {
  const change = quote.price_change_pct_24h
  const up = Number(change ?? 0) >= 0
  const selectedChain = useSelectedChain()
  const tokenChain = token?.chain ?? quote.chain ?? selectedChain
  const tradeAvailable = quote.trade_capability
    ? quote.trade_capability.status === 'available'
    : quote.tradability !== 'unavailable'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* The back arrow lives on this row rather than in a strip of its own.
            That strip carried the symbol too, so the page said "NVDAon" twice
            within fifty pixels and spent a whole row doing it. */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="text-muted-foreground hover:text-foreground -ml-1 shrink-0 rounded-full p-1 transition-colors hover:bg-white/10">
            <ArrowLeft className="size-4" />
          </button>
        )}
        {/* Falls back to initials on its own, which is what a token whose brand
            has not resolved yet renders as. */}
        {token && <TokenLogo token={token} chain={tokenChain} />}
        <div className="min-w-0">
          <div className="text-15 text-foreground truncate font-medium leading-tight">
            {quote.symbol}
          </div>
          <div className="text-11 text-muted-foreground truncate leading-tight">
            {token?.name ?? quote.ticker}
          </div>
        </div>
      </div>

      {/* No exchange-status line. The token trades around the clock, so whether
          NASDAQ happens to be open says nothing about the price above — and the
          chart no longer shades those hours either, for the same reason.

          The window is named on the change rather than left to be inferred, the
          way every market screen writes it: 1.89% of what, over how long. */}
      <div className="flex items-end gap-2">
        <div className="text-26 text-foreground font-medium tabular-nums leading-none">
          {formatUsd(quote.reference_price)}
        </div>
        {/* Colour and an arrow already say which way it went; a filled pill
            behind them said it a third time, and made the change compete with
            the price it belongs to. */}
        {change != null && (
          <span
            className={cn(
              'text-12 pb-0.5 font-medium tabular-nums',
              up ? 'text-positive' : 'text-destructive'
            )}>
            {up ? '▲' : '▼'} {formatPercent(change).replace(/^[+-]/, '')} (24h)
          </span>
        )}

        {/* Beside the price, which is what somebody decides on. The page
            already ends in a Buy button, but that one is below the chart, the
            divergence card and eight statistics — so the moment a person is
            most likely to act on is the moment the control is furthest away. */}
        <Button
          variant="primary"
          size="sm"
          className="text-12 ml-auto h-8 shrink-0 px-4 font-medium"
          disabled={!tradeAvailable}
          onClick={onBuy}>
          {tradeAvailable ? 'Buy' : 'No market'}
        </Button>
      </div>
    </div>
  )
}

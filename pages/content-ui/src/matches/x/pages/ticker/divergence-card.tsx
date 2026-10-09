import type { StockQuote } from '@x/services/catalyst'
import { cn } from '@extension/ui'
import { Info } from 'lucide-react'
import { useState } from 'react'

import { formatMultiplier, formatPercent, formatUsd } from './format'

/**
 * The comparison this product exists to make, given its own block.
 *
 * One token is not one share — the token reinvests dividends, so the multiplier
 * drifts above 1 — and everything here follows from dividing by it. That makes
 * the pair below the single most important thing on the page after the price:
 * what one token is worth expressed as a share, beside what a share actually
 * costs.
 *
 * It used to be four cells scattered through an eight-cell grid, with the gap
 * last and styled exactly like "Holders on Binance". A reader scanning the grid
 * had no way to tell that two of those cells were the product and the rest were
 * context, or that the two dollar figures were comparable only because of a
 * third cell three rows up.
 *
 * The sentence explaining it sits behind the toggle here rather than in the
 * page header, because this is the only block it explains.
 */

/**
 * Under a quarter of a percent is noise on a token this thin, and colouring it
 * would invite reading rounding as an opportunity.
 */
const MEANINGFUL_GAP_PERCENT = 0.25

const Side = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 flex-1">
    <div className="text-10 text-muted-foreground truncate">{label}</div>
    <div className="text-15 text-foreground mt-0.5 truncate font-medium tabular-nums">{value}</div>
  </div>
)

export const DivergenceCard = ({ quote }: { quote: StockQuote }) => {
  const [explained, setExplained] = useState(false)
  const { divergence, multiplier } = quote

  if (!divergence) {
    return (
      <div className="rounded-10 bg-white/[0.04] px-3 py-2.5">
        <Side label="Token, per share" value={formatUsd(quote.reference_price)} />
        <p className="text-10 text-muted-foreground mt-2 leading-relaxed">
          No issuer on BNB Chain publishes a share price for {quote.ticker}, so there is nothing to
          compare this against. The token price stands on its own.
        </p>
      </div>
    )
  }

  const gap = Number(divergence.percent)
  const wide = Number.isFinite(gap) && Math.abs(gap) >= MEANINGFUL_GAP_PERCENT

  return (
    <div className="rounded-10 bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-start gap-3">
        <Side label="Token, per share" value={formatUsd(quote.reference_price)} />
        <Side
          label={`Share${quote.stock_price_source ? ` · ${quote.stock_price_source}` : ''}`}
          value={formatUsd(divergence.stock_price)}
        />
        <button
          type="button"
          aria-expanded={explained}
          aria-label="Why these two can be compared"
          onClick={() => setExplained((open) => !open)}
          className={cn(
            'shrink-0 rounded-full p-1 transition-colors',
            explained
              ? 'text-foreground bg-white/10'
              : 'text-muted-foreground hover:text-foreground'
          )}>
          <Info className="size-3.5" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-white/[0.06] pt-2">
        <span className="text-10 text-muted-foreground">Gap</span>
        <span
          className={cn(
            'text-12 font-medium tabular-nums',
            wide ? 'text-warning' : 'text-foreground'
          )}>
          {formatPercent(divergence.percent, 3)}
        </span>
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <span className="text-10 text-muted-foreground truncate">
          {formatMultiplier(multiplier)} shares per token
        </span>
      </div>

      {explained && (
        <p className="text-10 text-muted-foreground mt-2 leading-relaxed">
          One {quote.symbol} is {quote.multiplier} shares, not one, because the token reinvests
          dividends. The price on the left is the token&rsquo;s divided by that, which is what makes
          it comparable to the share price beside it.
        </p>
      )}
    </div>
  )
}

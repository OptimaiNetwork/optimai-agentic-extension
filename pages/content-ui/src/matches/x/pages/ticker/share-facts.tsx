import type { ShareFundamentals } from '@x/services/catalyst'

import { formatUsd } from './format'

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

const num = (value: string | null) => (value == null ? null : Number(value))

/** Where today's price sits between the 52-week low and high, as a percentage. */
const positionIn = (low: number, high: number, price: number) =>
  high > low ? Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100)) : null

/**
 * The same surface the market cards and the comparison block use: a tint, no
 * border. Bordered tiles on a dark translucent panel read as a second window
 * inside the first, and this section was the only place still drawing them.
 */
const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-10 bg-white/[0.04] px-2.5 py-2">
    <div className="text-10 text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className="text-13 text-foreground mt-0.5 tabular-nums">{value}</div>
  </div>
)

interface ShareFactsProps {
  fundamentals: ShareFundamentals
  /** The multiplier-corrected token price, which is what compares to a share. */
  referencePrice: string
  ticker: string
  holders: number | null
  traders: number | null
}

/**
 * The company's own numbers, beside the token's.
 *
 * Kept visibly separate from the price table above it because they answer a
 * different question: a 52-week range is where the share traded on its own
 * exchange, not where the token traded on BNB Chain. Conflating the two is the
 * same class of mistake as comparing a token price to a share price without
 * dividing by the multiplier.
 *
 * Nothing here costs a request — it arrives on the same call as the price.
 */
export const ShareFacts = ({
  fundamentals,
  referencePrice,
  ticker,
  holders,
  traders,
}: ShareFactsProps) => {
  const low = num(fundamentals.week52_low)
  const high = num(fundamentals.week52_high)
  const price = Number(referencePrice)
  const position = low != null && high != null ? positionIn(low, high, price) : null

  const eps = num(fundamentals.eps)
  const roe = num(fundamentals.return_on_equity_percent)
  const pe = num(fundamentals.price_to_earnings)
  const dividend = num(fundamentals.dividend_yield_percent)
  const book = num(fundamentals.price_to_book)
  const cap = num(fundamentals.market_cap)

  return (
    <div className="space-y-2">
      <div className="text-12 text-foreground font-medium">
        {ticker} the company
        <span className="text-10 text-muted-foreground ml-1.5 font-normal">
          reported by its exchange, not the chain
        </span>
      </div>

      {low != null && high != null && (
        <div className="rounded-10 bg-white/[0.04] p-3">
          <div className="text-10 text-muted-foreground uppercase tracking-wide">52-week range</div>
          <div className="mt-2 h-1 w-full rounded-full bg-white/10">
            {position != null && (
              <div className="relative h-1" style={{ width: `${position}%` }}>
                <span className="bg-primary absolute right-0 top-1/2 size-2 -translate-y-1/2 rounded-full" />
              </div>
            )}
          </div>
          <div className="text-11 text-muted-foreground mt-1.5 flex justify-between tabular-nums">
            <span>{formatUsd(fundamentals.week52_low)}</span>
            <span>{formatUsd(fundamentals.week52_high)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* A company with no earnings has no ratio. Showing "0.00" would be a
            different and wrong claim, so the tile is simply absent. */}
        {eps != null && <Fact label="Earnings / share" value={formatUsd(fundamentals.eps)} />}
        {/* A negative return is a fact about the company, not something to hide. */}
        {roe != null && <Fact label="Return on equity" value={`${roe.toFixed(1)}%`} />}
        {pe != null && <Fact label="Price / earnings" value={pe.toFixed(2)} />}
        {dividend != null && dividend > 0 && (
          <Fact label="Dividend yield" value={`${dividend.toFixed(2)}%`} />
        )}
        {book != null && <Fact label="Price / book" value={book.toFixed(2)} />}
        {/* The company's cap, which is not the token's — the token's is in
            Statistics above and is three orders of magnitude smaller. Labelled
            so the two can never be read as the same number. */}
        {cap != null && <Fact label="Company market cap" value={`$${compact.format(cap)}`} />}
        {holders != null && <Fact label="Holders on Binance" value={compact.format(holders)} />}
        {traders != null && <Fact label="Traders on Binance" value={compact.format(traders)} />}
      </div>
    </div>
  )
}

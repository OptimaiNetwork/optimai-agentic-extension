import { CHAINS } from '@extension/shared'
import { cn } from '@extension/ui'
import { useSelectedChain } from '@x/modules/venue'
import type { StockQuote } from '@x/services/catalyst'

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 })

const compactUsd = (value: string | null): string => {
  const parsed = value == null ? NaN : Number(value)
  return Number.isFinite(parsed) ? `$${compact.format(parsed)}` : '—'
}

const compactUnits = (value: string | null, unit: string): string => {
  const parsed = value == null ? NaN : Number(value)
  return Number.isFinite(parsed) ? `${compact.format(parsed)} ${unit}` : '—'
}

const Stat = ({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'default' | 'warning'
}) => (
  <div className="min-w-0 border-b border-white/[0.06] py-2">
    <div className="text-10 text-muted-foreground truncate">{label}</div>
    <div
      className={cn(
        'text-13 mt-0.5 truncate tabular-nums',
        tone === 'warning' ? 'text-warning' : 'text-foreground'
      )}>
      {value}
    </div>
  </div>
)

/**
 * The token's own four facts, and nothing that belongs to the share.
 *
 * It held eight cells, four of which were the multiplier comparison — what one
 * token is worth as a share, what a share costs, the ratio between them, and
 * the gap. Those four are the product, and sitting in a grid beside "Holders on
 * Binance" at identical weight is not where the product goes. They are a block
 * of their own now; see `divergence-card.tsx`.
 *
 * What is left is what the token is, on its own chain: what it is all worth,
 * what traded, how many exist, how many people hold them. The company's numbers
 * are a separate section again, because a 52-week range is where the *share*
 * traded.
 */
export const Statistics = ({ quote }: { quote: StockQuote }) => {
  // Named by the quote, not hardcoded. It read "On BNB Chain" above every token
  // of every issuer, which stopped being true for two of the three the day Ondo
  // became a Solana issuer — the numbers under it were already Solana's.
  //
  // The selection is the fallback because only the Solana services put `chain`
  // in a quote; a bStocks quote has never carried one, and the issuer the panel
  // is reading names the chain just as well.
  const selectedChain = useSelectedChain()
  const chain = CHAINS[quote.chain ?? selectedChain].label

  return (
    <div>
      <div className="text-12 text-foreground mb-1 font-medium">On {chain}</div>
      <div className="grid grid-cols-2 gap-x-4">
        <Stat label="Market cap" value={compactUsd(quote.market_cap)} />
        <Stat label="Volume 24h" value={compactUsd(quote.volume_24h)} />
        <Stat label="Total supply" value={compactUnits(quote.total_supply, quote.symbol)} />
        <Stat
          label="Holders on Binance"
          value={quote.binance_holders != null ? compact.format(quote.binance_holders) : '—'}
        />
      </div>
    </div>
  )
}

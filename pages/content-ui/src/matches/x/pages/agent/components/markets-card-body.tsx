import type { MarketsCard } from '@extension/shared'
import { cn } from '@extension/ui'
import { ArrowLeftRight, Info } from 'lucide-react'
import { useId } from 'react'

import {
  CardFooter,
  Chip,
  ChainMark,
  NO_FIGURE,
  SectionLabel,
  Stat,
  chainName,
  compactUsd,
  parse,
  usd,
} from './card-kit'

/**
 * Where a token trades: its pools, by liquidity, with the best price marked.
 *
 * The point of the block is the disagreement, the same token quoted at two
 * prices in the same second. So the spread is stated up front, and each pool's
 * liquidity gets a bar, because "where can I actually buy size" is a question
 * about depth as much as price. Numbers are formatted here and never
 * re-derived: the server computed the spread.
 */

const COLUMNS = 'grid grid-cols-[30px_minmax(0,1fr)_70px_104px] items-center gap-2.5'

/**
 * A price keeps enough digits to be compared; two decimals renders a real
 * $0.00000042 market as `$0.00`, which is the one thing this column must not do.
 */
const price = (value?: string | null): string => {
  const parsed = parse(value)
  if (parsed === null || parsed <= 0) return NO_FIGURE
  if (parsed >= 1) return usd(parsed)
  if (parsed >= 0.01) return `$${parsed.toFixed(4)}`
  return `$${parsed.toPrecision(3)}`
}

/** Only http(s) reaches an href: the panel renders inside x.com. */
const safeHref = (url?: string | null): string | undefined => {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : undefined
  } catch {
    return undefined
  }
}

const SOURCE: Record<string, string> = {
  geckoterminal: 'GeckoTerminal',
  dexscreener: 'DEX Screener',
  jupiter: 'Jupiter',
}

/** The token's own symbol, read off the first pair: `TSLAB / USDT` → `TSLAB`. */
export const marketSymbol = (card: MarketsCard): string =>
  card.markets[0]?.pair.split('/')[0]?.trim() ||
  card.subject.ticker.replace(/^\$/, '').toUpperCase()

/** A drop whose water line rises and settles: liquidity, drawn. */
export const LiquidityPlate = () => {
  const clip = useId().replace(/[^a-zA-Z0-9]/g, '')
  const drop =
    'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'
  return (
    <span
      aria-hidden
      className="flex size-[30px] shrink-0 items-center justify-center rounded-[10px] bg-[rgba(90,169,255,0.1)] shadow-[inset_0_0_0_1px_rgba(90,169,255,0.3)]">
      <svg width="18" height="18" viewBox="0 0 24 24">
        <defs>
          <clipPath id={clip}>
            <path d={drop} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <path
            className="card-tide"
            d="M0 13 Q3 11.5 6 13 T12 13 T18 13 T24 13 V24 H0 Z"
            fill="#5aa9ff"
          />
        </g>
        <path d={drop} fill="none" stroke="#5aa9ff" strokeWidth="1.7" />
      </svg>
    </span>
  )
}

export const MarketsChainChip = ({ card }: { card: MarketsCard }) => (
  <Chip icon={<ChainMark chain={card.chain} size={12} />}>{chainName(card.chain)}</Chip>
)

export const MarketsCardBody = ({ card }: { card: MarketsCard }) => {
  const liquidity = card.markets.map((market) => parse(market.liquidityUsd) ?? 0)
  const deepest = Math.max(0, ...liquidity)
  const total = liquidity.reduce((sum, value) => sum + value, 0)
  const prices = card.markets
    .map((market) => parse(market.priceUsd))
    .filter((value): value is number => value !== null && value > 0)
  const best = prices.length > 1 ? Math.min(...prices) : null

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-3 gap-2.5 px-3.5 py-3">
        <Stat label="Pools" value={String(card.totalCount)} />
        <Stat label="Total liquidity" value={total > 0 ? compactUsd(total) : NO_FIGURE} />
        <Stat
          label="Price spread"
          value={
            card.priceSpreadPercent != null && card.spreadVenueCount >= 2
              ? `${parse(card.priceSpreadPercent)?.toFixed(2) ?? card.priceSpreadPercent}%`
              : NO_FIGURE
          }
        />
      </div>
      <div className={cn(COLUMNS, 'items-start px-3.5 pb-1.5')}>
        <span />
        <SectionLabel>Pool</SectionLabel>
        <span className="text-right">
          <SectionLabel>Price</SectionLabel>
        </span>
        <span className="text-right">
          <SectionLabel>Liquidity</SectionLabel>
        </span>
      </div>

      {card.markets.map((market, index) => {
        const depth = parse(market.liquidityUsd)
        const pancake = /pancake/i.test(market.venue)
        const isBest = best !== null && parse(market.priceUsd) === best
        const href = safeHref(market.url)
        const row = (
          <>
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-[9px]',
                pancake
                  ? 'bg-[rgba(240,185,11,0.12)] text-[#f0b90b]'
                  : 'bg-[#303030] text-[#c4c4c4]'
              )}>
              <ArrowLeftRight aria-hidden className="size-3.5" strokeWidth={1.9} />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-13 flex items-center gap-1.5 truncate font-semibold">
                <span className="truncate">{market.venue}</span>
                {isBest && (
                  <Chip tone="green" className="h-[18px] px-1.5 text-[10px]">
                    Best price
                  </Chip>
                )}
              </span>
              <span className="text-11 truncate text-[#9a9a9a]">
                {`${market.pair} · Vol `}
                <span className="tabular-nums">{compactUsd(market.volume24hUsd)}</span>
              </span>
            </div>
            <span className="text-13 text-right font-semibold tabular-nums">
              {price(market.priceUsd)}
            </span>
            <div className="flex flex-col items-end gap-[5px]">
              {/* `N/A`, not `$0`: an order book holds no reserve, and a zero
                  would say the market is empty when it is merely not an AMM. */}
              <span className="text-12 tabular-nums text-[#c4c4c4]">{compactUsd(depth)}</span>
              <div className="h-[5px] w-24 overflow-hidden rounded-[5px] bg-[#333333]">
                <div
                  className="card-grow h-[5px] rounded-[5px] bg-[#5aa9ff]"
                  style={{
                    width: `${Math.round(Math.max(depth && deepest ? depth / deepest : 0, 0.06) * 100)}%`,
                    animationDelay: `${0.3 + index * 0.12}s`,
                  }}
                />
              </div>
            </div>
          </>
        )
        const className = cn(COLUMNS, 'card-rise border-t border-[#323232] px-3.5 py-2.5')
        const style = { animationDelay: `${0.1 + index * 0.12}s` }
        return href ? (
          <a
            key={market.id}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${market.venue} ${market.pair} market`}
            className={cn(
              className,
              'text-inherit no-underline transition-colors hover:bg-white/[0.03]'
            )}
            style={style}>
            {row}
          </a>
        ) : (
          <div key={market.id} className={className} style={style}>
            {row}
          </div>
        )
      })}
    </div>
  )
}

export const MarketsFooter = ({ card }: { card: MarketsCard }) => (
  <CardFooter icon={<Info strokeWidth={1.75} />}>
    {`From ${SOURCE[card.source.toLowerCase()] ?? card.source}. The trade screen routes to the best pool when you buy.`}
  </CardFooter>
)

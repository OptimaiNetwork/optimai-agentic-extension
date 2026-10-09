import type { PortfolioCard } from '@extension/shared'
import { cn } from '@extension/ui'
import { ChevronDown, Info } from 'lucide-react'

import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'

import {
  CardFooter,
  CardToken,
  ChainMark,
  MoveChip,
  NO_FIGURE,
  Stat,
  listingFor,
  parse,
  quantity,
  usd,
} from './card-kit'

/**
 * What the connected wallets hold, and what those trades have done.
 *
 * The headline is total profit and loss, because that is the question people
 * ask, with the allocation beside it as a ring. The footer is the qualifier
 * that makes the number honest: this is built from trades recorded through
 * this extension, so a token the same wallet bought elsewhere is not here.
 *
 * Unpriced positions show N/A, never $0. A holding nobody could price is not
 * a worthless one, and the totals exclude it.
 */

const RING = ['#f0b90b', '#b98cff', '#5aa9ff', '#5eed87', '#ff8a7a']
const RADIUS = 38
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 4

/** A signed dollar figure: a plus when it made money, an arrow when it lost. */
const Signed = ({
  value,
  className,
  colored = true,
}: {
  value?: string | null
  className?: string
  /** The headline carries the colour; the stat cells beside it stay plain. */
  colored?: boolean
}) => {
  const parsed = parse(value)
  if (parsed === null) return <span className={className}>{NO_FIGURE}</span>
  if (parsed < 0) {
    return (
      <span
        className={cn('inline-flex items-center gap-1', colored && 'text-[#ff8a7a]', className)}>
        <ChevronDown aria-label="loss" className="size-[0.9em]" strokeWidth={2.6} />
        {usd(parsed)}
      </span>
    )
  }
  return (
    <span
      className={cn(
        colored && parsed > 0 && 'text-[#5eed87]',
        className
      )}>{`+${usd(parsed)}`}</span>
  )
}

const Ring = ({ card }: { card: PortfolioCard }) => {
  const weights = card.positions.map((position) => parse(position.weightPercent) ?? 0)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let offset = 0
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      role="img"
      aria-label={`Allocation across ${card.positions.length} positions`}
      className="shrink-0">
      <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="#333333" strokeWidth="10" />
      <g className="card-sweep" style={{ transformOrigin: '48px 48px' }}>
        {total > 0 &&
          weights.map((weight, index) => {
            const length = (weight / total) * CIRCUMFERENCE
            const dash = Math.max(length - (weights.length > 1 ? GAP : 0), 0)
            const segment = (
              <circle
                key={card.positions[index].ticker + card.positions[index].chain}
                cx="48"
                cy="48"
                r={RADIUS}
                fill="none"
                stroke={RING[index % RING.length]}
                strokeWidth="10"
                strokeDasharray={`${dash.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
                strokeDashoffset={(-offset).toFixed(1)}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '48px 48px' }}
              />
            )
            offset += length
            return segment
          })}
      </g>
      <text x="48" y="46" textAnchor="middle" fill="#ececec" fontSize="16" fontWeight="600">
        {card.openPositionCount}
      </text>
      <text x="48" y="60" textAnchor="middle" fill="#9a9a9a" fontSize="9">
        {card.openPositionCount === 1 ? 'position' : 'positions'}
      </text>
    </svg>
  )
}

/** The token's own symbol on its venue (NVDAB, TSLAon); the ticker until it resolves. */
const PositionSymbol = ({ ticker, venue }: { ticker: string; venue: string }) => {
  const resolved = useResolveCashtag(ticker, { selection: listingFor(venue) })
  return <>{resolved.data?.symbol ?? ticker}</>
}

/** The chains the positions sit on, as marks for the header. */
export const PortfolioChains = ({ card }: { card: PortfolioCard }) => {
  const chains = [...new Set(card.positions.map((position) => position.chain))]
  if (!chains.length) return null
  return (
    <span className="flex items-center gap-1">
      {chains.map((chain) => (
        <ChainMark key={chain} chain={chain} size={14} />
      ))}
    </span>
  )
}

export const PortfolioCardBody = ({ card }: { card: PortfolioCard }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-4 p-3.5">
      <Ring card={card} />
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-11 text-[#9a9a9a]">Total profit and loss</span>
        <Signed
          value={card.totalPnl}
          className="text-[28px] font-semibold tabular-nums leading-8 tracking-[-0.02em]"
        />
        <span className="text-11 text-[#9a9a9a]">
          on a cost basis of{' '}
          <span className="tabular-nums text-[#c4c4c4]">{usd(card.costBasis)}</span>
        </span>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-2.5 px-3.5 pb-3.5">
      <Stat label="Realized" value={<Signed value={card.realizedPnl} colored={false} />} />
      <Stat label="Unrealized" value={<Signed value={card.unrealizedPnl} colored={false} />} />
      <Stat label="Value" value={usd(card.marketValue)} />
      <Stat
        label="Win rate"
        value={
          card.winRatePercent == null ? NO_FIGURE : `${parse(card.winRatePercent)?.toFixed(0)}%`
        }
      />
    </div>

    {card.positions.map((position, index) => {
      const move = parse(position.unrealizedPnlPercent)
      const weight = parse(position.weightPercent)
      return (
        <div
          key={`${position.chain}-${position.ticker}`}
          className="card-rise grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-[#323232] px-3.5 py-2.5"
          style={{ animationDelay: `${0.25 + index * 0.12}s` }}>
          <CardToken
            ticker={position.ticker}
            venueKey={position.venue}
            chain={position.chain}
            size={28}
          />
          <div className="flex min-w-0 flex-col">
            <span className="text-13 flex items-center gap-1.5 font-semibold">
              <span
                aria-hidden
                className="size-[7px] shrink-0 rounded-full"
                style={{ background: RING[index % RING.length] }}
              />
              <PositionSymbol ticker={position.ticker} venue={position.venue} />
              {weight !== null && (
                <span className="text-11 font-normal text-[#9a9a9a]">{`${weight.toFixed(0)}%`}</span>
              )}
            </span>
            <span className="text-11 truncate text-[#9a9a9a]">
              <span className="tabular-nums">{quantity(position.quantity, 4)}</span> tokens · avg{' '}
              <span className="tabular-nums">{usd(position.averageEntryPrice)}</span> · now{' '}
              <span className="tabular-nums">{usd(position.currentPrice)}</span>
            </span>
          </div>
          {move === null ? (
            <span className="text-11 text-[#9a9a9a]">{NO_FIGURE}</span>
          ) : (
            <MoveChip value={move} />
          )}
        </div>
      )
    })}
  </div>
)

export const PortfolioFooter = () => (
  <CardFooter icon={<Info strokeWidth={1.75} />}>
    Counts trades made through this extension only. Buys made elsewhere are not included.
  </CardFooter>
)

import type { TradeIntentCard } from '@extension/shared'
import { cn } from '@extension/ui'
import { VenueMark } from '@x/modules/venue/marks'
import { ArrowRight, Check, Clock, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { dynamicPaths, type TokenNavigationState } from '@x/routers/paths'
import { setSelection } from '@x/modules/venue'
import type { ChainId, VenueId } from '@x/modules/venue'

import { CardToken, Chip, chainName, listingFor, quantity, usd } from './card-kit'

/**
 * A trade the user asked for, priced, with one button to go and do it.
 *
 * The button navigates. It does not quote, approve or sign: the trade screen it
 * opens does all three, with a live price, and the wallet is still the only
 * thing that can turn any of it into a transaction. The three steps under the
 * figures say exactly that, so the card cannot be read as an order placed.
 *
 * The price shown is the one the model saw. It is labelled indicative and the
 * screen re-quotes on arrival, because the gap between a chat message and a tap
 * is exactly where a price moves.
 */

const SETTLEMENT: Record<string, { bg: string; ink: string; glyph: string }> = {
  USDC: { bg: '#2775ca', ink: '#ffffff', glyph: '$' },
  USDT: { bg: '#26a17b', ink: '#ffffff', glyph: '₮' },
}

/** The settlement token as a coin: its own colour and glyph. */
const SettlementCoin = ({ token }: { token: string }) => {
  const coin = SETTLEMENT[token.toUpperCase()] ?? {
    bg: '#3a3a3a',
    ink: '#ececec',
    glyph: token.slice(0, 1),
  }
  return (
    <span
      aria-hidden
      className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
      style={{ background: coin.bg, color: coin.ink }}>
      {coin.glyph}
    </span>
  )
}

const route = (chain: string): string => (chain === 'solana' ? 'via Jupiter' : 'via PancakeSwap')

const STEPS = [
  { label: 'Confirm here', icon: Check },
  { label: 'Live quote', icon: Clock },
  { label: 'Sign in wallet', icon: Lock },
] as const

const Steps = () => (
  <ol className="m-0 flex list-none items-start justify-center p-0 pb-1 pt-2.5">
    {STEPS.map((step, index) => {
      const active = index === 0
      const Icon = step.icon
      return (
        <li key={step.label} className="flex items-start">
          {index > 0 && (
            <svg aria-hidden width="44" height="10" viewBox="0 0 44 10" className="mt-[9px]">
              <path
                d="M2 5 H42"
                className={index === 1 ? 'card-flow' : undefined}
                fill="none"
                stroke={index === 1 ? '#4f7d5c' : '#3a3a3a'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={index === 1 ? undefined : '2 5'}
              />
            </svg>
          )}
          <div className="flex w-[92px] flex-col items-center gap-1.5">
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full',
                active
                  ? 'card-glow bg-[rgba(94,237,135,0.12)] shadow-[inset_0_0_0_1.5px_#5eed87]'
                  : 'bg-[#303030] shadow-[inset_0_0_0_1px_#3d3d3d]'
              )}>
              <Icon
                aria-hidden
                className={cn('size-3.5', active ? 'text-[#5eed87]' : 'text-[#9a9a9a]')}
                strokeWidth={2}
              />
            </span>
            <span
              className={cn('text-11 text-center', active ? 'text-[#ececec]' : 'text-[#9a9a9a]')}>
              {step.label}
            </span>
          </div>
        </li>
      )
    })}
  </ol>
)

export const NotSignedChip = () => (
  <Chip icon={<Lock aria-hidden className="size-[11px]" strokeWidth={2} />}>Not signed</Chip>
)

export const TradeIntentCardBody = ({ card }: { card: TradeIntentCard }) => {
  const navigate = useNavigate()
  const buying = card.side === 'buy'
  const listing = listingFor(card.subject.venue)
  const chain = card.chain as ChainId

  const open = () => {
    const venue = card.subject.venue as VenueId | undefined
    // The screen reads the selection, so move it first. Without this a card
    // raised while the panel sat on another issuer opens that issuer's token.
    if (venue) setSelection(venue, chain)
    const state: TokenNavigationState = { venue, chain, side: card.side, amount: card.amount }
    navigate(dynamicPaths.buy(card.subject.ticker), { state })
  }

  const settlement = (
    <span className="flex items-center gap-2">
      <SettlementCoin token={card.payToken} />
      <span className="text-xl font-semibold tabular-nums">
        {buying ? usd(card.amount) : usd(card.estimatedAmount)}
      </span>
    </span>
  )
  const stock = (
    <span className="flex items-center gap-2">
      <CardToken
        ticker={card.subject.ticker}
        venueKey={card.subject.venue}
        chain={chain}
        size={22}
      />
      <span className="truncate text-xl font-semibold tabular-nums">
        {quantity(buying ? card.estimatedAmount : card.amount)}
      </span>
    </span>
  )
  const settlementCaption = `${card.payToken} on ${chainName(chain)}`

  return (
    <div className="flex flex-col gap-3 p-3.5">
      <div className="relative grid grid-cols-2 gap-2">
        <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#323232] bg-[#242424] p-3">
          <span className="text-11 text-[#9a9a9a]">You pay</span>
          {buying ? settlement : stock}
          <span className="text-11 truncate text-[#9a9a9a]">
            {buying ? settlementCaption : card.symbol}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[rgba(94,237,135,0.22)] bg-[rgba(94,237,135,0.05)] p-3">
          <span className="text-11 text-[#9a9a9a]">You receive, about</span>
          {buying ? stock : settlement}
          <span className="text-11 truncate text-[#9a9a9a]">
            {buying ? card.symbol : settlementCaption}
          </span>
        </div>
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 -ml-[15px] -mt-[15px] flex size-[30px] items-center justify-center overflow-hidden rounded-full bg-[#282828] shadow-[0_0_0_1px_#3d3d3d]">
          <span className="card-travel -ml-3.5 flex">
            <ArrowRight className="size-[15px] text-[#5eed87]" strokeWidth={2.2} />
          </span>
        </span>
      </div>

      <div className="text-11 flex items-center justify-between gap-2 text-[#9a9a9a]">
        <span className="truncate">
          {card.priceUsd ? (
            <>
              <span className="tabular-nums text-[#c4c4c4]">{usd(card.priceUsd)}</span>
              {` per ${card.symbol}, indicative`}
            </>
          ) : (
            'No indicative price yet'
          )}
        </span>
        <span className="flex shrink-0 items-center gap-[5px]">
          {listing && <VenueMark venue={listing.venue} className="size-[11px]" />}
          {`${card.venueLabel.split('·')[0].trim()} · ${route(card.chain)}`}
        </span>
      </div>

      <Steps />

      <button
        type="button"
        onClick={open}
        className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[#5eed87] text-sm font-bold text-[#06120a] transition-[filter] hover:brightness-105 active:brightness-95">
        {buying ? `Buy ${card.symbol}` : `Sell ${card.symbol}`}
        <ArrowRight aria-hidden className="size-4" strokeWidth={2.4} />
      </button>
      <span className="text-11 flex items-center justify-center gap-1.5 text-[#9a9a9a]">
        <Lock aria-hidden className="size-3" strokeWidth={1.75} />
        Nothing is signed until your wallet asks.
      </span>
    </div>
  )
}

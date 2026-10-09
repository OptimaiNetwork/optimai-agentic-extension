import type { ComparisonRow, IssuerComparisonCard, MarketSnapshotCard } from '@extension/shared'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, cn } from '@extension/ui'
import { VenueMark } from '@x/modules/venue/marks'
import { Check, Clock, Info, Moon, Sun } from 'lucide-react'

import {
  CardFooter,
  Chip,
  Inset,
  MoveChip,
  NO_FIGURE,
  SectionLabel,
  Stat,
  VenueTile,
  compactUsd,
  listingFor,
  parse,
  pct,
  routeFor,
  time,
  usd,
} from './card-kit'
import { venueLabel } from './research-card-shell'

/**
 * Market numbers, with one of them made the point.
 *
 * The rule the whole product turns on is that a token price and the share
 * price it tracks are different quantities, and the multiplier-adjusted
 * reference price is a third. So the adjusted price is the hero, the card
 * shows how it is made (token price over multiplier), and the gap against the
 * share gets a meter of its own.
 *
 * Values arrive as decimal strings and are formatted, never re-derived. The
 * server computed the gap; recomputing it here would be a second
 * implementation of the one calculation that has to be right.
 */

/** Below this the gap is arithmetic noise, about a swap fee. */
const FAIR_GAP_PERCENT = 0.25

type Session = 'open' | 'pre' | 'after' | 'closed'

export const sessionOf = (session?: string | null): Session | undefined => {
  if (!session) return undefined
  if (/regular|open/i.test(session)) return 'open'
  if (/pre/i.test(session)) return 'pre'
  if (/post|after/i.test(session)) return 'after'
  return 'closed'
}

const SESSION_LABEL: Record<Session, string> = {
  open: 'Market open',
  pre: 'Premarket',
  after: 'After hours',
  closed: 'Market closed',
}

type Clock = [hours: number, minutes: number]

/** Nasdaq's sessions, New York time. Closed is quoted by the next premarket open. */
const SESSION_HOURS: Record<Session, { from: Clock; to?: Clock }> = {
  pre: { from: [4, 0], to: [9, 30] },
  open: { from: [9, 30], to: [16, 0] },
  after: { from: [16, 0], to: [20, 0] },
  closed: { from: [4, 0] },
}

const clock = ([hours, minutes]: Clock): string => `${hours}:${String(minutes).padStart(2, '0')}`

/**
 * A New York time of day on the reader's own clock, or `undefined` when the
 * reader is in New York. The offset is read for today, so it follows daylight
 * saving on both sides.
 */
export const onYourClock = (at: Clock, now = new Date()): string | undefined => {
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York') return undefined
  const newYork = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const offset = Math.round((now.getTime() - newYork.getTime()) / 60_000) * 60_000
  newYork.setHours(at[0], at[1], 0, 0)
  return new Date(newYork.getTime() + offset).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

/** What a session means for this token, with its hours. No dashes: the panel's copy uses none. */
export const sessionTip = (kind: Session, now = new Date()): string => {
  const { from, to } = SESSION_HOURS[kind]
  const yourFrom = onYourClock(from, now)
  const yourTo = to && onYourClock(to, now)
  const hours = to
    ? `${clock(from)} to ${clock(to)} New York time${yourFrom && yourTo ? ` (${yourFrom} to ${yourTo} your time)` : ''}`
    : `${clock(from)} New York time${yourFrom ? ` (${yourFrom} your time)` : ''}`
  switch (kind) {
    case 'pre':
      return `Nasdaq trades early, ${hours}. Fewer orders change hands, so prices move more easily until the regular session opens. The token itself trades around the clock.`
    case 'open':
      return `Nasdaq's regular session, ${hours}. The share and the token both trade now, so their prices can be compared directly.`
    case 'after':
      return `Nasdaq trades lightly after the close, ${hours}. Fewer orders change hands, so prices move more easily. The token itself trades around the clock.`
    default:
      return `Nasdaq is shut overnight and at weekends, until premarket at ${hours}. The token keeps trading, so it can move before the share does.`
  }
}

const SESSION_TONE: Record<Session, 'green' | 'amber' | 'neutral'> = {
  open: 'green',
  pre: 'amber',
  after: 'amber',
  closed: 'neutral',
}

/** The session chip for the card header, with what the session means on hover or focus. */
export const MarketSessionChip = ({ session }: { session?: string | null }) => {
  const kind = sessionOf(session)
  if (!kind) return null
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="m-0 flex cursor-help rounded-full border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40">
          <Chip tone={SESSION_TONE[kind]}>{SESSION_LABEL[kind]}</Chip>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="text-11 w-[240px] rounded-[10px] border-[#3d3d3d] bg-[#1c1c1c] px-3 py-2.5 leading-4 text-[#c4c4c4] shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-none">
          <span className="mb-1 block text-[11.5px] font-semibold text-[#ececec]">
            {SESSION_LABEL[kind]}
          </span>
          {sessionTip(kind)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const SESSION_NOTE: Record<Session, string> = {
  open: 'The US market is open, so both prices are live.',
  pre: "The US market hasn't opened yet. The token trades around the clock, so a gap now usually means the chain is reacting early, not a mispricing.",
  after: 'The US market is in after hours. The token keeps trading through it.',
  closed:
    'The US market is closed. The token trades around the clock, so a gap now usually means the chain is reacting early, not a mispricing.',
}

/* ---------------------------------------------------------- the equation --- */

const Term = ({
  label,
  value,
  accent,
  delay,
}: {
  label: string
  value: string
  accent?: boolean
  delay: string
}) => (
  <div
    className={cn(
      'card-rise relative flex min-w-0 flex-1 flex-col gap-0.5 rounded-[10px] border px-2.5 py-[7px]',
      accent
        ? 'card-glow border-[rgba(94,237,135,0.35)] bg-[rgba(94,237,135,0.08)]'
        : 'border-[#3d3d3d] bg-[#282828]'
    )}
    style={{ animationDelay: delay }}>
    <span
      className={cn('text-[10px] leading-[13px]', accent ? 'text-[#5eed87]' : 'text-[#9a9a9a]')}>
      {label}
    </span>
    <span
      className={cn(
        'truncate text-sm font-semibold tabular-nums leading-[18px]',
        accent && 'text-[#5eed87]'
      )}>
      {value}
    </span>
  </div>
)

const Operator = ({ children, delay }: { children: string; delay: string }) => (
  <span
    aria-hidden
    className="card-fade relative text-base tabular-nums text-[#9a9a9a]"
    style={{ animationDelay: delay }}>
    {children}
  </span>
)

const Equation = ({ card, issuer }: { card: MarketSnapshotCard; issuer?: string }) => {
  if (!card.tokenPrice || !card.referencePrice || !card.multiplier) return null
  const multiplier = parse(card.multiplier)
  const note =
    multiplier !== null && multiplier > 1
      ? `${issuer ?? 'The issuer'} reinvests dividends, so one token holds slightly more than one share.`
      : 'One token tracks one share, so the two prices match.'
  return (
    <Inset className="flex flex-col gap-2.5 p-3">
      <div className="flex items-center justify-between">
        <SectionLabel>How the adjusted price is made</SectionLabel>
        <Info aria-hidden className="size-[13px] text-[#9a9a9a]" strokeWidth={1.75} />
      </div>
      <div className="relative flex items-center gap-2">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-x-2.5 top-1/2 h-0.5 -translate-y-1/2 overflow-visible"
          preserveAspectRatio="none">
          <line
            x1="8%"
            x2="92%"
            y1="1"
            y2="1"
            className="card-flow"
            stroke="#3a3a3a"
            strokeWidth="2"
          />
        </svg>
        <Term label="Token price" value={usd(card.tokenPrice.value)} delay=".15s" />
        <Operator delay=".35s">÷</Operator>
        <Term
          label="Multiplier"
          value={multiplier === null ? NO_FIGURE : multiplier.toFixed(4)}
          delay=".3s"
        />
        <Operator delay=".5s">=</Operator>
        <Term label="Adjusted" value={usd(card.referencePrice.value)} accent delay=".45s" />
      </div>
      <span className="text-11 leading-[15px] text-[#9a9a9a]">{note}</span>
    </Inset>
  )
}

/* ------------------------------------------------------- the gap meter --- */

const GapMeter = ({ card }: { card: MarketSnapshotCard }) => {
  const adjusted = card.referencePrice ?? card.tokenPrice
  const gap = parse(card.gapPercent)
  if (!adjusted || !card.sharePrice || gap === null) return null

  const fair = Math.abs(gap) < FAIR_GAP_PERCENT
  const tokenBelow = gap < 0
  const session = sessionOf(card.marketSession)
  const Icon = session === 'open' ? Sun : Moon
  const tag = fair ? 'In line' : `${pct(gap)} ${tokenBelow ? 'below' : 'above'}`

  // The lower price sits on the left, so the bar always reads "from here up to there".
  const token = <span className="size-3.5 rounded-full bg-[#5eed87] shadow-[0_0_0_3px_#242424]" />
  const share = <span className="size-3.5 rounded-full bg-[#ececec] shadow-[0_0_0_3px_#242424]" />

  return (
    <Inset className="flex flex-col gap-2.5 p-3">
      <div className="flex items-center justify-between">
        <SectionLabel>Against the US share</SectionLabel>
        <span className={cn('text-11 font-semibold', fair ? 'text-[#5eed87]' : 'text-[#ffb000]')}>
          {tag}
        </span>
      </div>
      <div className="relative h-[34px]">
        <div className="absolute inset-x-0 top-[15px] h-1 rounded bg-[#333333]" />
        <div
          className="card-grow absolute left-[44px] right-[26px] top-[15px] h-1 rounded bg-[linear-gradient(90deg,rgba(255,176,0,0.15),rgba(255,176,0,0.55))]"
          style={{ animationDelay: '.5s' }}
        />
        <div
          className="card-slidein absolute left-9 top-[9px] flex"
          style={{ animationDelay: '.4s' }}>
          {tokenBelow ? token : share}
        </div>
        <div className="absolute right-5 top-[9px] flex">{tokenBelow ? share : token}</div>
      </div>
      <div className="text-11 -mt-1.5 flex justify-between">
        {tokenBelow ? (
          <>
            <span className="text-[#5eed87]">
              {'Token, adjusted '}
              <span className="tabular-nums">{usd(adjusted.value)}</span>
            </span>
            <span className="text-[#c4c4c4]">
              Share <span className="tabular-nums">{usd(card.sharePrice.value)}</span>
            </span>
          </>
        ) : (
          <>
            <span className="text-[#c4c4c4]">
              Share <span className="tabular-nums">{usd(card.sharePrice.value)}</span>
            </span>
            <span className="text-[#5eed87]">
              {'Token, adjusted '}
              <span className="tabular-nums">{usd(adjusted.value)}</span>
            </span>
          </>
        )}
      </div>
      {session && (
        <span className="text-11 flex items-center gap-1.5 leading-[15px] text-[#9a9a9a]">
          <Icon aria-hidden className="size-3 shrink-0" strokeWidth={1.75} />
          {SESSION_NOTE[session]}
        </span>
      )}
    </Inset>
  )
}

/* ------------------------------------------------------------ snapshot --- */

export const MarketSnapshotBody = ({ card }: { card: MarketSnapshotCard }) => {
  // A card restored from an older checkpoint may lack the reference price. The
  // token price then stands in, labelled as what it is.
  const hero = card.referencePrice ?? card.tokenPrice
  const heroLabel = card.referencePrice ? 'Adjusted price' : 'Token price'
  const change = parse(card.priceChangePct24h)
  const issuer = venueLabel(card.subject.venue)
  const multiplier = parse(card.multiplier)

  return (
    <div className="flex flex-col gap-3 p-3.5">
      {hero && (
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-11 text-[#9a9a9a]">{heroLabel}</span>
            <span className="text-[32px] font-semibold tabular-nums leading-9 tracking-[-0.02em]">
              {usd(hero.value)}
            </span>
          </div>
          {change !== null && (
            <div className="flex flex-col items-end gap-1 pb-1">
              <MoveChip value={change} />
              <span className="text-[10px] text-[#9a9a9a]">past 24 hours</span>
            </div>
          )}
        </div>
      )}

      <Equation card={card} issuer={issuer} />
      <GapMeter card={card} />

      <div className="grid grid-cols-3 gap-2.5 px-0.5 pt-0.5">
        <Stat
          label={card.marketCap ? 'Market cap' : '24h volume'}
          value={compactUsd(card.marketCap ?? card.volume24h)}
        />
        <Stat label="Multiplier" value={multiplier === null ? NO_FIGURE : multiplier.toFixed(4)} />
        <Stat label="Route" value={routeFor(card.subject.venue) ?? NO_FIGURE} />
      </div>
    </div>
  )
}

export const MarketSnapshotFooter = ({ card }: { card: MarketSnapshotCard }) => {
  const at = time(card.observedAt)
  const issuer = venueLabel(card.subject.venue)
  return (
    <CardFooter icon={<Clock strokeWidth={1.75} />}>
      {`${at ? `Read at ${at}` : 'Read'}${issuer ? ` from ${issuer}` : ''}. Prices move between reads.`}
    </CardFooter>
  )
}

/* ------------------------------------------------------ issuer comparison */

const COLUMNS = 'grid grid-cols-[28px_minmax(0,1fr)_84px_70px_64px] items-center gap-2.5'

/** Up to three issuer marks, overlapped, for the head of a comparison. */
export const IssuerCluster = ({ rows }: { rows: readonly ComparisonRow[] }) => {
  const venues = [
    ...new Set(
      rows.map((row) => listingFor(row.venue)?.venue).filter((venue) => venue !== undefined)
    ),
  ].slice(0, 3)
  const spots = ['left-0 top-0', 'right-0 top-1', 'bottom-0 left-1.5']
  return (
    <span aria-hidden className="relative size-[30px] shrink-0">
      {venues.map((venue, index) => (
        <span
          key={venue}
          className={cn(
            'absolute flex size-[18px] items-center justify-center rounded-md bg-[#1c1c1c] shadow-[0_0_0_2px_#282828]',
            spots[index]
          )}>
          <VenueMark venue={venue} className="size-[11px]" />
        </span>
      ))}
    </span>
  )
}

export const IssuerComparisonBody = ({ card }: { card: IssuerComparisonCard }) => {
  const priced = card.rows
    .map((row) => ({ row, price: parse(row.referencePrice) }))
    .filter((entry): entry is { row: ComparisonRow; price: number } => entry.price !== null)
  const lowest = priced.length ? Math.min(...priced.map((entry) => entry.price)) : null
  const highest = priced.length ? Math.max(...priced.map((entry) => entry.price)) : null
  const spread =
    lowest !== null && highest !== null && lowest > 0 ? ((highest - lowest) / lowest) * 100 : null
  const tradable = card.rows.filter((row) => row.tradable === true)

  const bar = (price: number): number => {
    if (lowest === null || highest === null || highest === lowest) return 0.6
    return 0.3 + (0.6 * (price - lowest)) / (highest - lowest)
  }

  return (
    <div className="flex flex-col">
      <div className={cn(COLUMNS, 'items-start px-3.5 pb-1.5 pt-3')}>
        <span />
        <SectionLabel>Issuer</SectionLabel>
        <SectionLabel>Relative</SectionLabel>
        <span className="text-right">
          <SectionLabel>Adjusted</SectionLabel>
        </span>
        <span className="text-right">
          <SectionLabel>vs low</SectionLabel>
        </span>
      </div>

      {card.rows.map((row, index) => {
        const price = parse(row.referencePrice)
        const route = routeFor(row.venue)
        if (price === null) {
          return (
            <div
              key={`${row.venue}-${row.symbol}`}
              className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-[#323232] px-3.5 py-2.5 opacity-[0.62]">
              <VenueTile venueKey={row.venue} />
              <div className="flex min-w-0 flex-col">
                <span className="text-13 truncate font-semibold">{row.venueLabel}</span>
                <span className="text-11 truncate text-[#9a9a9a]">
                  {row.unavailableReason ?? 'Not in this catalog'}
                </span>
              </div>
              <span className="text-11 text-[#9a9a9a]">Not listed</span>
            </div>
          )
        }
        const isLowest = price === lowest && priced.length > 1
        const versus = lowest !== null && lowest > 0 ? ((price - lowest) / lowest) * 100 : null
        return (
          <div
            key={`${row.venue}-${row.symbol}`}
            className={cn(
              COLUMNS,
              'card-rise border-t border-[#323232] px-3.5 py-2.5',
              isLowest && 'bg-[rgba(94,237,135,0.04)]'
            )}
            style={{ animationDelay: `${0.1 + index * 0.12}s` }}>
            <VenueTile venueKey={row.venue} />
            <div className="flex min-w-0 flex-col">
              <span className="text-13 truncate font-semibold">{row.venueLabel}</span>
              <span className="text-11 truncate text-[#9a9a9a]">{route ?? row.symbol}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-md bg-[#333333]">
              <div
                className="card-grow h-1.5 rounded-md"
                style={{
                  width: `${Math.round(bar(price) * 100)}%`,
                  background: isLowest ? '#5eed87' : '#6b6b6b',
                  animationDelay: `${0.3 + index * 0.12}s`,
                }}
              />
            </div>
            <span className="text-13 text-right font-semibold tabular-nums">{usd(price)}</span>
            <span className="flex justify-end">
              {isLowest ? (
                <Chip tone="green" icon={<Check className="size-[11px]" strokeWidth={2.6} />}>
                  Lowest
                </Chip>
              ) : (
                <span
                  className={cn(
                    'text-12 tabular-nums',
                    versus !== null && versus >= FAIR_GAP_PERCENT
                      ? 'text-[#ffb000]'
                      : 'text-[#9a9a9a]'
                  )}>
                  {versus === null ? NO_FIGURE : `+${pct(versus)}`}
                </span>
              )}
            </span>
          </div>
        )
      })}

      {spread !== null && (
        <Inset className="mx-3.5 mb-3.5 mt-1 flex items-start gap-2 rounded-[10px] px-3 py-2.5">
          <Info aria-hidden className="mt-px size-3.5 shrink-0 text-[#9a9a9a]" strokeWidth={1.75} />
          <span className="text-12 leading-[17px] text-[#c4c4c4]">
            The spread across issuers is{' '}
            <b className="font-bold tabular-nums text-[#ececec]">{pct(spread)}</b>.
            {tradable.length === 1 && ` Only ${tradable[0].venueLabel} trades from your venue.`} A
            spread is not a trade signal.
          </span>
        </Inset>
      )}
    </div>
  )
}

/** "3 of 4 list it": how many issuers the comparison actually priced. */
export const listedCount = (card: IssuerComparisonCard): string => {
  const listed = card.rows.filter((row) => parse(row.referencePrice) !== null).length
  return `${listed} of ${card.rows.length} list it`
}

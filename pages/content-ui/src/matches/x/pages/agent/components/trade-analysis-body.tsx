import type { AnalysisRisk, AnalysisSignal, TradeAnalysisCard } from '@extension/shared'
import { cn } from '@extension/ui'
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  Compass,
  Droplet,
  Moon,
  PieChart,
  Repeat,
  Sun,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { Chip, MoveChip, SectionLabel, parse, quantity, time, usd } from './card-kit'
import { XLogoIcon } from './x-icons'

/**
 * The answer to "should I buy?", drawn from numbers the server computed.
 *
 * Nothing here decides anything. The split, the lean, every signal's reading
 * and every risk's level arrive in the payload; this file only chooses words
 * for them and draws them. The one thing the payload does not carry is the
 * disclaimer, which lives here so that no model output can shorten it or
 * leave it off.
 */

type Side = 'buy' | 'hold' | 'sell'

const SIDE_COLOR: Record<Side, string> = {
  buy: '#5eed87',
  hold: '#ffb000',
  sell: '#ff8a7a',
}

const SIDE_NAME: Record<Side, string> = { buy: 'Buy', hold: 'Hold', sell: 'Sell' }

/** The verdict in words. Selling something you do not hold is staying out. */
export const leanHeadline = (lean: Side, held: boolean): string => {
  if (lean === 'buy') return 'Toward buying'
  if (lean === 'hold') return 'Toward waiting'
  return held ? 'Toward selling' : 'Against buying now'
}

export const sideCaption = (side: Side, held: boolean): string => {
  if (side === 'buy') return 'Open or add'
  if (side === 'hold') return 'Wait and watch'
  return held ? 'Trim or exit' : 'Trim or stay out'
}

/** Degrees the beam settles at: toward Buy (left, negative) or Sell (right). */
export const beamTilt = (split: { buy: number; sell: number }): number =>
  Math.max(-12, Math.min(12, ((split.sell - split.buy) / 100) * 24))

const CONFIDENCE: Record<TradeAnalysisCard['confidence'], { label: string; bars: number }> = {
  low: { label: 'Low confidence', bars: 1 },
  moderate: { label: 'Moderate confidence', bars: 2 },
  high: { label: 'High confidence', bars: 3 },
}

/* ---------------------------------------------------------- the verdict --- */

const ConfidenceBars = ({ level }: { level: number }) => (
  <svg width="11" height="8" viewBox="0 0 11 8" aria-hidden>
    {[0, 1, 2].map((bar) => (
      <rect
        key={bar}
        x={bar * 4}
        y={8 - (3 + bar * 2.5)}
        width="3"
        height={3 + bar * 2.5}
        rx="1"
        fill={bar < level ? '#c4c4c4' : '#4a4a4a'}
      />
    ))}
  </svg>
)

/** A scale weighing the signals: the beam settles toward the side that leads. */
const Balance = ({ tilt }: { tilt: number }) => {
  const pan = (cx: number, color: string, word: string) => (
    <g
      className="card-hang"
      style={{ ['--tilt' as string]: `${-tilt}deg`, transformOrigin: `${cx}px 20px` }}>
      <path
        d={`M${cx} 20 L${cx - 9} 40 M${cx} 20 L${cx + 9} 40`}
        stroke="#5a5a5a"
        strokeWidth="1.2"
      />
      <path
        d={`M${cx - 13} 40 H${cx + 13} Q${cx} 52 ${cx - 13} 40 Z`}
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text x={cx} y="64" textAnchor="middle" fontSize="9" fontWeight="600" fill={color}>
        {word}
      </text>
    </g>
  )
  return (
    <svg
      width="110"
      height="96"
      viewBox="0 0 96 84"
      aria-hidden
      className="block shrink-0 overflow-visible">
      <path d="M48 22 V74" stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M36 76 H60" stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round" />
      <g
        className="card-tilt"
        style={{ ['--tilt' as string]: `${tilt}deg`, transformOrigin: '48px 20px' }}>
        <path d="M12 20 H84" stroke="#c4c4c4" strokeWidth="2.5" strokeLinecap="round" />
        {pan(12, SIDE_COLOR.buy, 'Buy')}
        {pan(84, SIDE_COLOR.sell, 'Sell')}
      </g>
      <circle cx="48" cy="20" r="5" fill={SIDE_COLOR.hold} stroke="#282828" strokeWidth="2" />
    </svg>
  )
}

const Verdict = ({ card }: { card: TradeAnalysisCard }) => {
  const confidence = CONFIDENCE[card.confidence]
  const price = card.price ? usd(card.price.value) : undefined
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-11 leading-[14px] text-[#9a9a9a]">Where the data leans</span>
        <span
          className="card-fade text-2xl font-semibold leading-7 tracking-[-0.01em]"
          style={{ color: SIDE_COLOR[card.lean], animationDelay: '0.4s' }}>
          {leanHeadline(card.lean, card.held)}
        </span>
        <span className="flex flex-wrap gap-1.5">
          <Chip icon={<ConfidenceBars level={confidence.bars} />} className="gap-1.5">
            {confidence.label}
          </Chip>
          {price && (
            <Chip className="bg-transparent text-[#9a9a9a] shadow-[inset_0_0_0_1px_#3d3d3d]">
              Read at <span className="tabular-nums">{price}</span>
            </Chip>
          )}
        </span>
      </div>
      <Balance tilt={beamTilt(card.split)} />
    </div>
  )
}

/* ------------------------------------------------------------ the split --- */

const SIDES: Side[] = ['buy', 'hold', 'sell']

const SplitBlock = ({ card }: { card: TradeAnalysisCard }) => (
  <div className="flex flex-col gap-3">
    <div
      role="img"
      aria-label={SIDES.map((side) => `${SIDE_NAME[side]} ${card.split[side]}%`).join(', ')}
      className="flex gap-[3px]">
      {SIDES.filter((side) => card.split[side] > 0).map((side, index) => (
        <span
          key={side}
          className="card-grow h-2.5 rounded-[3px]"
          style={{
            width: `${card.split[side]}%`,
            background: SIDE_COLOR[side],
            animationDelay: `${0.2 + index * 0.15}s`,
          }}
        />
      ))}
    </div>
    <div className="grid grid-cols-3 gap-2.5">
      {SIDES.map((side) => {
        const lead = side === card.lean
        return (
          <div key={side} className="flex min-w-0 flex-col gap-0.5">
            <span
              className={cn(
                'text-11 flex items-center gap-1.5 font-semibold leading-[14px]',
                lead ? 'text-[#ececec]' : 'text-[#c4c4c4]'
              )}>
              <span
                aria-hidden
                className="size-2 rounded-[3px]"
                style={{ background: SIDE_COLOR[side] }}
              />
              {SIDE_NAME[side]}
            </span>
            <span
              className={cn(
                'text-xl font-semibold tabular-nums leading-6 tracking-[-0.01em]',
                lead ? 'text-[#ececec]' : 'text-[#c4c4c4]'
              )}>
              {card.split[side]}%
            </span>
            <span className="text-[10.5px] leading-[14px] text-[#9a9a9a]">
              {sideCaption(side, card.held)}
            </span>
          </div>
        )
      })}
    </div>
  </div>
)

/* ---------------------------------------------------------- the holding --- */

const Position = ({ position }: { position: NonNullable<TradeAnalysisCard['position']> }) => {
  const gain = parse(position.unrealizedPnlPercent)
  const weight = parse(position.weightPercent)
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[#3d3d3d] bg-white/[0.02] px-3 py-2.5">
      <Wallet aria-hidden className="size-[15px] shrink-0 text-[#c4c4c4]" strokeWidth={1.75} />
      <span className="text-12 min-w-0 flex-1 truncate leading-4 text-[#c4c4c4]">
        You hold <span className="tabular-nums text-[#ececec]">{quantity(position.quantity)}</span>{' '}
        {position.symbol}
      </span>
      {gain !== null && <MoveChip value={gain} />}
      {weight !== null && (
        <span className="text-11 shrink-0 leading-[14px] text-[#9a9a9a]">
          <span className="tabular-nums text-[#c4c4c4]">{Math.round(weight)}%</span> of your book
        </span>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- the signals --- */

const SIGNAL_NAME: Record<AnalysisSignal['key'], string> = {
  trend: 'Trend',
  growth: 'Growth',
  sentiment: 'X sentiment',
  valuation: 'Valuation',
  momentum: 'Momentum',
}

const LEAN_CHIP = {
  bullish: { tone: 'green', label: 'Bullish', color: '#5eed87' },
  neutral: { tone: 'neutral', label: 'Neutral', color: '#c4c4c4' },
  bearish: { tone: 'coral', label: 'Bearish', color: '#ff8a7a' },
} as const

/**
 * Each signal and risk keeps one colour of its own, so the eye can find "the
 * valuation row" by hue. The hues sit apart from the verdict colours (green,
 * coral, amber): an icon's colour names the category, never the lean.
 */
type Plate = { fg: string; bg: string; ring: string }

const tinted = (hex: string): Plate => ({ fg: hex, bg: `${hex}1a`, ring: `${hex}4d` })

export const SIGNAL_PLATE: Record<AnalysisSignal['key'], Plate> = {
  trend: tinted('#5aa9ff'),
  growth: tinted('#34d6c0'),
  // X's own mark, on X's own black.
  sentiment: { fg: '#ececec', bg: '#0a0a0a', ring: '#333333' },
  valuation: tinted('#a78bfa'),
  momentum: tinted('#f472b6'),
}

/** A signal that could not be read keeps no colour: it did not count. */
const UNREAD_PLATE: Plate = { fg: '#6b6b6b', bg: '#303030', ring: '#3d3d3d' }

const signalIcon = (signal: AnalysisSignal, className: string, color: string): ReactNode => {
  const props = { className, style: { color }, strokeWidth: 1.75, 'aria-hidden': true }
  switch (signal.key) {
    case 'trend':
      return parse(signal.score) !== null && parse(signal.score)! < 0 ? (
        <TrendingDown {...props} />
      ) : (
        <TrendingUp {...props} />
      )
    case 'growth':
      return <BarChart3 {...props} />
    case 'sentiment':
      return <XLogoIcon className={cn(className, 'size-[13px]')} style={{ color }} />
    case 'valuation':
      return <CircleDollarSign {...props} />
    default:
      return <Activity {...props} />
  }
}

/** Bearish to bullish, from the centre out. */
const Meter = ({ score, color }: { score: number; color: string }) => {
  const half = 30
  const width = Math.abs(score) * half
  return (
    <span aria-hidden className="relative block h-1 w-[60px] rounded bg-[#333333]">
      <span
        className="card-grow absolute top-0 h-1 rounded"
        style={{
          left: score >= 0 ? half : half - width,
          width,
          background: color,
          transformOrigin: score >= 0 ? 'left center' : 'right center',
          animationDelay: '0.6s',
        }}
      />
      <span className="absolute -top-0.5 left-[29.5px] h-2 w-px bg-[#5a5a5a]" />
    </span>
  )
}

const SignalRow = ({ signal, index }: { signal: AnalysisSignal; index: number }) => {
  const lean = signal.lean ? LEAN_CHIP[signal.lean] : undefined
  const score = parse(signal.score)
  const plate = lean ? SIGNAL_PLATE[signal.key] : UNREAD_PLATE
  return (
    <div
      className={cn(
        'card-rise flex items-center gap-2.5 py-[9px]',
        index > 0 && 'border-t border-[#323232]',
        !lean && 'opacity-[0.72]'
      )}
      style={{ animationDelay: `${(0.25 + index * 0.08).toFixed(2)}s` }}>
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-[9px]"
        style={{ background: plate.bg, boxShadow: `inset 0 0 0 1px ${plate.ring}` }}>
        {signalIcon(signal, 'size-[15px]', plate.fg)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            'text-[12.5px] font-semibold leading-4',
            lean ? 'text-[#ececec]' : 'text-[#9a9a9a]'
          )}>
          {SIGNAL_NAME[signal.key]}
        </span>
        <span className="text-11 leading-[15px] text-[#9a9a9a]">{signal.reading}</span>
      </span>
      {lean && score !== null ? (
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <Chip tone={lean.tone} className="h-5 text-[10.5px]">
            {lean.label}
          </Chip>
          <Meter score={score} color={lean.color} />
        </span>
      ) : (
        <span className="shrink-0 text-[10.5px] font-semibold text-[#9a9a9a]">Not read</span>
      )}
    </div>
  )
}

const Signals = ({ card }: { card: TradeAnalysisCard }) => {
  const read = card.signals.filter((signal) => signal.lean).length
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-0.5">
        <SectionLabel>What the data says</SectionLabel>
        <span className="text-[10.5px] leading-[14px] text-[#9a9a9a]">
          <span className="tabular-nums">{read}</span> of{' '}
          <span className="tabular-nums">{card.signals.length}</span> signals read
        </span>
      </div>
      {card.signals.map((signal, index) => (
        <SignalRow key={signal.key} signal={signal} index={index} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ the risks --- */

const RISK_NAME: Record<AnalysisRisk['key'], string> = {
  volatility: 'Volatility',
  liquidity: 'Liquidity',
  premium: 'Token vs share',
  session: 'Session',
  concentration: 'Concentration',
}

const LEVEL = {
  low: { label: 'Low', color: '#8a8a8a' },
  medium: { label: 'Medium', color: '#ffb000' },
  high: { label: 'High', color: '#ff8a7a' },
} as const

export const RISK_COLOR: Record<AnalysisRisk['key'], string> = {
  volatility: '#fb923c',
  liquidity: '#38bdf8',
  premium: '#818cf8',
  session: '#fde68a',
  concentration: '#f472b6',
}

/** A closed session is night: the moon, in a cooler tone than the sun. */
const riskColor = (risk: AnalysisRisk): string =>
  risk.key === 'session' && risk.level !== 'low' ? '#a5b4fc' : RISK_COLOR[risk.key]

const riskIcon = (risk: AnalysisRisk): ReactNode => {
  const props = {
    className: 'size-[13px] shrink-0',
    style: { color: riskColor(risk) },
    strokeWidth: 1.75,
    'aria-hidden': true,
  }
  switch (risk.key) {
    case 'volatility':
      return <Activity {...props} />
    case 'liquidity':
      return <Droplet {...props} />
    case 'premium':
      return <Repeat {...props} />
    case 'concentration':
      return <PieChart {...props} />
    default:
      return risk.level === 'low' ? <Sun {...props} /> : <Moon {...props} />
  }
}

const Risks = ({ risks }: { risks: AnalysisRisk[] }) => (
  <div className="flex flex-col gap-2">
    <SectionLabel>What argues for waiting</SectionLabel>
    <div className="grid grid-cols-2 gap-2">
      {risks.map((risk) => (
        <div
          key={risk.key}
          className="flex min-w-0 flex-col gap-[5px] rounded-[11px] border border-[#323232] bg-[#242424] p-2.5">
          <span className="flex items-center gap-1.5">
            {riskIcon(risk)}
            <span className="flex-1 truncate text-[11.5px] font-semibold leading-[15px] text-[#ececec]">
              {RISK_NAME[risk.key]}
            </span>
            <span
              className="shrink-0 text-[10px] font-semibold leading-3"
              style={{ color: LEVEL[risk.level].color }}>
              {LEVEL[risk.level].label}
            </span>
          </span>
          <span className="text-11 leading-[15px] text-[#9a9a9a]">{risk.reading}</span>
        </div>
      ))}
    </div>
  </div>
)

/* ------------------------------------------------------- the disclaimer --- */

/** Always shown, never collapsible, and never sent by the server. */
export const disclaimerText = (at?: string): string =>
  `This weighs what the data showed${at ? ` at ${at}` : ''}: price history, the conversation on X and the company's own numbers. It cannot see tomorrow's news, and past moves promise nothing about the next one. Use the split to frame your decision, not to make it. Whether to trade, how much and when is always up to you, and only with money you can afford to lose.`

const Disclaimer = ({ at }: { at?: string }) => (
  <aside
    aria-label="The call is yours"
    className="flex gap-2.5 rounded-xl border border-[#323232] bg-[#242424] p-3">
    <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(94,237,135,0.08)]">
      <Compass aria-hidden className="size-[15px] text-[#5eed87]" strokeWidth={1.9} />
    </span>
    <span className="flex flex-col gap-1">
      <span className="text-[12.5px] font-semibold leading-4 text-[#ececec]">
        The call is yours
      </span>
      <span className="text-[11.5px] leading-[17px] text-[#c4c4c4]">{disclaimerText(at)}</span>
    </span>
  </aside>
)

/* ----------------------------------------------------------------- body --- */

export const TradeAnalysisBody = ({ card }: { card: TradeAnalysisCard }) => (
  <div className="flex flex-col gap-3.5 px-3.5 pb-3.5 pt-3">
    <Verdict card={card} />
    <SplitBlock card={card} />
    {card.position && <Position position={card.position} />}
    <Signals card={card} />
    {card.risks.length > 0 && <Risks risks={card.risks} />}
    <Disclaimer at={time(card.observedAt)} />
  </div>
)

const METHOD =
  'Each signal scores from bearish to bullish and counts by how much data stands behind it. The more they agree, the more weight moves from Hold toward Buy or Sell; risks like a thin market or a closed exchange pull weight back to Hold. The percentages are computed, not written by the assistant.'

export const TradeAnalysisFooter = ({ card }: { card: TradeAnalysisCard }) => {
  const [open, setOpen] = useState(false)
  const methodId = useId()
  const at = time(card.observedAt)
  const sources = card.sourceIds.length
  const Chevron = open ? ChevronUp : ChevronDown
  return (
    <footer className="flex flex-col border-t border-[#323232]">
      <div className="text-11 flex items-center gap-[7px] py-1.5 pl-3.5 pr-2 leading-[15px] text-[#9a9a9a]">
        <Clock aria-hidden className="size-[13px] shrink-0" strokeWidth={1.75} />
        <span>
          {at ? `Read at ${at}` : 'Read'}
          {sources > 0 && ` from ${sources} source${sources === 1 ? '' : 's'}`}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={methodId}
          onClick={() => setOpen((value) => !value)}
          className="text-11 ml-auto flex h-[26px] items-center gap-1 rounded-lg bg-transparent px-2 font-semibold text-[#c4c4c4] hover:bg-white/5">
          How the split works
          <Chevron aria-hidden className="size-3" strokeWidth={2} />
        </button>
      </div>
      {open && (
        <p id={methodId} className="text-11 m-0 px-3.5 pb-3 leading-4 text-[#9a9a9a]">
          {METHOD}
        </p>
      )}
    </footer>
  )
}

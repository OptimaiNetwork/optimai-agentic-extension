import type { PortfolioPosition, PortfolioStats } from '@x/services/catalyst'

import { CHAIN_NAME, compactUsd, sharePercent, usdValue, VENUE_LABEL } from './format'
import { useOpenToken } from './use-open-token'

// Equal lightness and chroma, one hue each, so no slice outshouts the others.
const SLICE_COLORS = ['#6ed889', '#4eccd3', '#80b3fd', '#f68678', '#e8be62'] as const
const OTHER_COLOR = '#6b7078'
const TRACK_COLOR = '#323232'
const MAX_SLICES = SLICE_COLORS.length
const DONUT = { size: 132, stroke: 18, gap: 0.8 }

interface Slice {
  key: string
  label: string
  share: number
  value: number
  color: string
  position?: PortfolioPosition
}

/** Priced positions, largest first; past five, the tail is one "more" slice. */
const slicesOf = (positions: PortfolioPosition[]): Slice[] => {
  const priced = positions.filter((p) => p.weight_percent != null)
  const shown = priced.length > MAX_SLICES ? MAX_SLICES - 1 : MAX_SLICES
  const head = priced.slice(0, shown).map((p, i) => ({
    key: `${p.chain}:${p.token_address}`,
    label: `${p.ticker} on ${CHAIN_NAME[p.chain]}`,
    share: Number(p.weight_percent),
    value: Number(p.market_value),
    color: SLICE_COLORS[i],
    position: p,
  }))
  const rest = priced.slice(shown)
  if (!rest.length) return head
  return [
    ...head,
    {
      key: 'more',
      label: `${rest.length} more`,
      share: rest.reduce((total, p) => total + Number(p.weight_percent), 0),
      value: rest.reduce((total, p) => total + Number(p.market_value), 0),
      color: OTHER_COLOR,
    },
  ]
}

const Donut = ({ slices, total }: { slices: Slice[]; total: string }) => {
  const { size, stroke } = DONUT
  const radius = (size - stroke) / 2
  const center = size / 2
  const gap = slices.length > 1 ? DONUT.gap : 0
  const offsets = slices.map((_, i) => slices.slice(0, i).reduce((t, s) => t + s.share, 0))
  return (
    <div
      role="img"
      aria-label={`Allocation: ${slices.map((s) => `${s.label} ${sharePercent(s.share)}`).join(', ')}`}
      className="relative size-[132px] shrink-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full" aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth={stroke}
        />
        {slices.map((slice, i) => {
          const length = Math.max(slice.share - gap, 0.1)
          return (
            <circle
              key={slice.key}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              pathLength={100}
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={-offsets[i]}
              transform={`rotate(-90 ${center} ${center})`}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-16 text-foreground font-semibold tabular-nums">
          {compactUsd(total)}
        </span>
        <span className="text-11 text-faint">Total</span>
      </div>
    </div>
  )
}

const Dot = ({ color }: { color: string }) => (
  <span
    aria-hidden="true"
    className="size-2.5 shrink-0 rounded-full"
    style={{ background: color }}
  />
)

const ROW = 'grid grid-cols-[10px_minmax(0,1fr)_auto_auto] items-center gap-2.5 py-2'

const Figures = ({ slice }: { slice: Slice }) => (
  <>
    <span className="text-12 text-secondary-foreground text-right tabular-nums">
      {sharePercent(slice.share)}
    </span>
    <span className="text-12 text-foreground min-w-[64px] text-right tabular-nums">
      {usdValue(String(slice.value))}
    </span>
  </>
)

/** One slice: which token, where it lives, its share and what it is worth. */
const LegendRow = ({ slice, last }: { slice: Slice; last: boolean }) => {
  const openToken = useOpenToken()
  const { position } = slice
  const divider = last ? '' : 'border-b border-white/[0.05]'
  if (!position) {
    return (
      <div className={`${ROW} ${divider}`}>
        <Dot color={slice.color} />
        <span className="text-12 text-secondary-foreground">{slice.label}</span>
        <Figures slice={slice} />
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => openToken(position)}
      className={`group ${ROW} ${divider} w-full text-left transition-colors hover:bg-white/[0.03]`}>
      <Dot color={slice.color} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-13 text-foreground truncate font-semibold group-hover:underline">
          {position.ticker}
        </span>
        <span className="text-11 text-faint truncate">
          {CHAIN_NAME[position.chain]} · {VENUE_LABEL[position.venue]}
        </span>
      </span>
      <Figures slice={slice} />
    </button>
  )
}

/** Where the money sits, by position. Unpriced ones are out of it, as the footnote says. */
export const AllocationCard = ({ stats }: { stats: PortfolioStats }) => {
  const slices = slicesOf(stats.positions)
  if (!slices.length) return null
  return (
    <section
      aria-label="Allocation"
      className="bg-surface border-border-soft rounded-16 flex flex-col gap-3.5 border p-5">
      <h2 className="text-13 text-foreground font-semibold">
        Allocation <span className="text-secondary-foreground font-normal">(by market value)</span>
      </h2>
      <div className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-5">
        <Donut slices={slices} total={stats.market_value} />
        <div className="flex min-w-0 flex-col">
          {slices.map((slice, index) => (
            <LegendRow key={slice.key} slice={slice} last={index === slices.length - 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

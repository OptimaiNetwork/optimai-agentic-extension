import type { PriceChartCard } from '@extension/shared'
import { Info, Moon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'

import { CardFooter, MoveChip, Stat, parse, usd } from './card-kit'
import { sessionOf } from './market-card-body'

/**
 * The card's price history, drawn as the card design draws it.
 *
 * A hand-drawn SVG rather than the chart library, so the line can draw itself
 * in, the stretch the exchange was shut can be hatched, and the last close can
 * breathe. It is still a chart a reader can read: hovering shows the close and
 * the time under the pointer.
 *
 * Three things this does because of what the data is:
 *
 * **The dashed baseline is the first close**, so a move reads against where the
 * window opened, not against zero.
 *
 * **Out-of-session candles are hatched** and the footer says why. The token
 * trades continuously and the exchange behind it does not; a flat overnight
 * stretch is the market being shut, not the price holding still.
 *
 * **Nothing is drawn for one candle.** A line through one point is a trend with
 * no evidence, and this component is also reached from older checkpoints.
 */

const HEIGHT = 150
const TOP = 12
const BOTTOM = 14

/** `1h` → 3,600,000. Zero for an interval this panel cannot read. */
const intervalMs = (interval: string): number => {
  const match = /^(\d+)\s*([mhdw])$/i.exec(interval.trim())
  if (!match) return 0
  const unit =
    { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[match[2].toLowerCase()] ?? 0
  return Number(match[1]) * unit
}

/**
 * "24h", "5d", "3w": how far back the chart reaches. The last candle covers an
 * interval of its own, so 24 hourly candles span 24 hours, not 23.
 */
export const spanLabel = (from: string, to: string, interval = ''): string | undefined => {
  const hours = (Date.parse(to) - Date.parse(from) + intervalMs(interval)) / 3_600_000
  if (!Number.isFinite(hours) || hours <= 0) return undefined
  if (hours < 36) return `${Math.round(hours)}h`
  const days = hours / 24
  if (days < 10) return `${Math.round(days)}d`
  return `${Math.round(days / 7)}w`
}

/** `1h` → "1 hour", `15m` → "15 minutes". */
export const intervalName = (interval: string): string => {
  const match = /^(\d+)\s*([mhdw])$/i.exec(interval.trim())
  if (!match) return interval
  const count = Number(match[1])
  const unit = { m: 'minute', h: 'hour', d: 'day', w: 'week' }[match[2].toLowerCase()] ?? ''
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

/** `1h` → "Hourly". Anything else keeps its own name. */
export const cadence = (interval: string): string => {
  const name = intervalName(interval)
  if (name === '1 hour') return 'Hourly'
  if (name === '1 day') return 'Daily'
  if (name === '1 week') return 'Weekly'
  return `Every ${name}`
}

const BASIS: Record<PriceChartCard['basis'], string> = {
  token: 'token price',
  share: 'share price',
  reference: 'adjusted price',
}

const clock = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** The width the chart has, followed as the panel resizes. */
const useWidth = (fallback: number) => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width)
      if (next > 0) setWidth(next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

interface Point {
  x: number
  y: number
  close: number
  time: string
  closed: boolean
}

/** Runs of consecutive out-of-session candles, as index ranges. */
const closedRuns = (points: readonly Point[]): Array<[number, number]> => {
  const runs: Array<[number, number]> = []
  let start = -1
  points.forEach((point, index) => {
    if (point.closed && start < 0) start = index
    if (!point.closed && start >= 0) {
      runs.push([start, index - 1])
      start = -1
    }
  })
  if (start >= 0) runs.push([start, points.length - 1])
  return runs.filter(([from, to]) => to > from)
}

export const PriceChartBody = ({ card }: { card: PriceChartCard }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [host, width] = useWidth(424)
  const [hover, setHover] = useState<number | null>(null)

  const closes = card.candles
    .map((candle) => ({ candle, close: parse(candle.close) }))
    .filter(
      (entry): entry is { candle: (typeof card.candles)[number]; close: number } =>
        entry.close !== null
    )

  if (closes.length < 2) {
    return (
      <p className="px-3.5 py-3 text-sm text-[#9a9a9a]">
        Only one price point was returned, which is not enough to chart.
      </p>
    )
  }

  const values = closes.map((entry) => entry.close)
  const lows = card.candles
    .map((candle) => parse(candle.low))
    .filter((v): v is number => v !== null)
  const highs = card.candles
    .map((candle) => parse(candle.high))
    .filter((v): v is number => v !== null)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min || max * 0.01) * 0.12
  const lo = min - pad
  const hi = max + pad
  const x = (index: number) => 4 + (index * (width - 8)) / (closes.length - 1)
  const y = (value: number) => TOP + ((hi - value) / (hi - lo)) * (HEIGHT - TOP - BOTTOM)

  const points: Point[] = closes.map((entry, index) => ({
    x: x(index),
    y: y(entry.close),
    close: entry.close,
    time: entry.candle.time,
    closed: entry.candle.session != null && sessionOf(entry.candle.session) !== 'open',
  }))
  const line = `M${points.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' L')}`
  const area = `${line} L${points[points.length - 1].x.toFixed(1)} ${HEIGHT} L${points[0].x.toFixed(1)} ${HEIGHT} Z`
  const runs = closedRuns(points)
  const widest = runs.reduce<[number, number] | null>(
    (best, run) => (!best || run[1] - run[0] > best[1] - best[0] ? run : best),
    null
  )

  const first = values[0]
  const last = values[values.length - 1]
  const change = first > 0 ? ((last - first) / first) * 100 : null
  const span = spanLabel(
    closes[0].candle.time,
    closes[closes.length - 1].candle.time,
    card.interval
  )
  const lowIndex = values.indexOf(min)
  const lowPoint = points[lowIndex]
  const end = points[points.length - 1]
  const ticks = [0, 0.25, 0.5, 0.75].map((f) =>
    Math.min(points.length - 1, Math.round(f * points.length))
  )
  const recent = Date.now() - Date.parse(end.time) < 2 * 3_600_000

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const offset = event.clientX - box.left
    const index = Math.round(((offset - 4) / (width - 8)) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, index)))
  }
  const hovered = hover === null ? null : points[hover]

  return (
    <div className="flex flex-col">
      <div className="flex items-end justify-between px-3.5 pb-2.5 pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-11 text-[#9a9a9a]">{`Last close, ${BASIS[card.basis]}`}</span>
          <span className="text-[28px] font-semibold tabular-nums leading-8 tracking-[-0.02em]">
            {usd(last)}
          </span>
        </div>
        {change !== null && (
          <div className="flex items-center gap-1.5 pb-[3px]">
            <MoveChip value={change} />
            {span && <span className="text-11 text-[#9a9a9a]">{span}</span>}
          </div>
        )}
      </div>

      <div ref={host} className="relative mx-3.5">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`${card.subject.ticker} closes${span ? `, last ${span}` : ''}`}
          className="block overflow-visible"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5eed87" stopOpacity="0.28" />
              <stop offset="1" stopColor="#5eed87" stopOpacity="0" />
            </linearGradient>
            <pattern
              id={`${id}-hatch`}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)">
              <rect width="6" height="6" fill="rgba(255,255,255,0.015)" />
              <path d="M0 0 V6" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
            </pattern>
          </defs>
          {runs.map(([from, to]) => (
            <rect
              key={from}
              x={points[from].x - 6}
              y="0"
              width={points[to].x - points[from].x + 12}
              height={HEIGHT}
              rx="6"
              fill={`url(#${id}-hatch)`}
            />
          ))}
          <path
            d={`M0 ${points[0].y.toFixed(1)} H${width}`}
            stroke="#4a4a4a"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <path
            className="card-fade"
            d={area}
            fill={`url(#${id}-fill)`}
            style={{ animationDelay: '.6s' }}
          />
          <path
            className="card-draw"
            d={line}
            fill="none"
            stroke="#5eed87"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {lowIndex !== points.length - 1 && (
            <circle
              className="card-fade"
              cx={lowPoint.x}
              cy={lowPoint.y}
              r="3"
              fill="#282828"
              stroke="#c4c4c4"
              strokeWidth="1.5"
              style={{ animationDelay: '1.2s' }}
            />
          )}
          <circle
            className="card-ping"
            cx={end.x}
            cy={end.y}
            r="9"
            fill="#5eed87"
            style={{ transformOrigin: `${end.x}px ${end.y}px` }}
          />
          <circle cx={end.x} cy={end.y} r="4" fill="#5eed87" stroke="#282828" strokeWidth="2" />
          {hovered && (
            <g pointerEvents="none">
              <path
                d={`M${hovered.x} 0 V${HEIGHT}`}
                stroke="rgba(236,236,236,0.25)"
                strokeWidth="1"
              />
              <circle cx={hovered.x} cy={hovered.y} r="3.5" fill="#ececec" />
            </g>
          )}
        </svg>
        {widest && points[widest[1]].x - points[widest[0]].x > 80 && (
          <span
            className="pointer-events-none absolute top-2 flex items-center gap-[5px] text-[10px] text-[#9a9a9a]"
            style={{ left: points[widest[0]].x + 2 }}>
            <Moon aria-hidden className="size-[11px]" strokeWidth={1.75} />
            US market closed
          </span>
        )}
        {lowIndex !== points.length - 1 && (
          <span
            className="card-fade pointer-events-none absolute text-[10px] tabular-nums text-[#c4c4c4]"
            style={{
              left: Math.max(0, Math.min(width - 72, lowPoint.x - 34)),
              top: Math.min(HEIGHT - 12, lowPoint.y + 8),
              animationDelay: '1.2s',
            }}>
            {`Low ${usd(min)}`}
          </span>
        )}
        {hovered && (
          <span
            className="text-11 pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-[#1c1c1c] px-2 py-1 tabular-nums text-[#ececec] shadow-[0_0_0_1px_#3d3d3d]"
            style={{ left: Math.max(40, Math.min(width - 40, hovered.x)) }}>
            {usd(hovered.close)} · {clock(hovered.time)}
          </span>
        )}
      </div>

      <div className="flex justify-between px-3.5 pt-1.5 text-[10px] tabular-nums text-[#9a9a9a]">
        {ticks.map((index) => (
          <span key={index}>{clock(points[index].time)}</span>
        ))}
        <span>{recent ? 'Now' : clock(end.time)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 p-3.5">
        <Stat label="Low" value={usd(lows.length ? Math.min(...lows) : min)} />
        <Stat label="High" value={usd(highs.length ? Math.max(...highs) : max)} />
        <Stat label="Interval" value={intervalName(card.interval)} />
      </div>
    </div>
  )
}

/** Says why the hatched stretch is flat, when there is one. */
export const PriceChartFooter = ({ card }: { card: PriceChartCard }) => {
  const closed = card.candles.some(
    (candle) => candle.session != null && sessionOf(candle.session) !== 'open'
  )
  if (!closed) return null
  return (
    <CardFooter icon={<Info strokeWidth={1.75} />}>
      The flat stretch is the exchange shut overnight, not a quiet market.
    </CardFooter>
  )
}

/** The window the chart covers, as the header's segment chip. */
export const SpanChip = ({ card }: { card: PriceChartCard }) => {
  const first = card.candles[0]
  const last = card.candles[card.candles.length - 1]
  const span = first && last ? spanLabel(first.time, last.time, card.interval) : undefined
  if (!span) return null
  return (
    <span className="flex rounded-lg border border-[#323232] bg-[#242424] p-0.5">
      <span className="text-11 rounded-md bg-[#3a3a3a] px-2 py-[3px] font-semibold text-[#ececec]">
        {span}
      </span>
    </span>
  )
}

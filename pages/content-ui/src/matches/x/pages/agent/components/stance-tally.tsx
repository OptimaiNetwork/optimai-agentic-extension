import type { SampleCoverage, StanceCounts } from '@extension/shared'
import { cn } from '@extension/ui'
import { Info } from 'lucide-react'
import type { CSSProperties } from 'react'

import { CardFooter, Chip } from './card-kit'

/**
 * The counted stances, as a gauge, a bar and a legend.
 *
 * The needle points at the lean (bullish minus bearish over the relevant
 * posts), the headline says it in a word, and the bar and legend show every
 * bucket, zeros included, so the signal never reads cleaner than the evidence.
 * Percentages and the angle are computed here from integers the server
 * counted, against `sample.relevant`, the one denominator the card may use.
 */

const SEGMENTS = [
  { key: 'bullish', label: 'Bullish', color: '#5eed87' },
  { key: 'neutral', label: 'Neutral', color: '#8a8a8a' },
  { key: 'bearish', label: 'Bearish', color: '#ff8a7a' },
  { key: 'mixed', label: 'Mixed', color: '#ffb000' },
  { key: 'uncertain', label: 'Uncertain', color: '#5c6470' },
  { key: 'unclassified', label: 'Unread', color: 'transparent' },
] as const

const LEANING = 0.35
/** Below this many relevant posts a tally is a hint, and the header says so. */
export const SMALL_SAMPLE = 30

const TONE: Record<string, string> = {
  bullish: 'text-[#5eed87]',
  bearish: 'text-[#ff8a7a]',
  neutral: 'text-[#c4c4c4]',
  mixed: 'text-[#ffb000]',
}

/** The lean in one word, and the bucket it comes from. */
export const stanceHeadline = (
  counts: StanceCounts,
  total: number
): { label: string; count: number; className: string } => {
  const ranked = (['bullish', 'bearish', 'neutral', 'mixed'] as const)
    .map((key) => ({ key, count: counts[key] }))
    .sort((a, b) => b.count - a.count)
  const top = ranked[0]
  if (top.count === 0 || total === 0)
    return { label: 'No clear stance', count: 0, className: 'text-[#9a9a9a]' }
  if (top.count / total < LEANING)
    return { label: 'Split', count: top.count, className: 'text-[#ececec]' }
  const label = top.key.charAt(0).toUpperCase() + top.key.slice(1)
  return { label, count: top.count, className: TONE[top.key] }
}

const arc = (from: number, to: number, radius = 70, cx = 90, cy = 92): string => {
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180
    return `${(cx + radius * Math.cos(radians)).toFixed(1)} ${(cy - radius * Math.sin(radians)).toFixed(1)}`
  }
  return `M${point(from)} A${radius} ${radius} 0 0 1 ${point(to)}`
}

const Gauge = ({
  counts,
  total,
  label,
}: {
  counts: StanceCounts
  total: number
  label: string
}) => {
  const lean = total > 0 ? (counts.bullish - counts.bearish) / total : 0
  const angle = Math.max(-80, Math.min(80, lean * 90))
  return (
    <svg
      width="180"
      height="104"
      viewBox="0 0 180 104"
      role="img"
      aria-label={`Leans ${label.toLowerCase()}`}
      className="block shrink-0">
      <path
        d={arc(178, 122)}
        fill="none"
        stroke="#ff8a7a"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path d={arc(116, 64)} fill="none" stroke="#6b6b6b" strokeWidth="10" strokeLinecap="round" />
      <path
        d={arc(58, 2)}
        fill="none"
        stroke="#5eed87"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.9"
      />
      <g
        className="card-needle"
        style={
          { transformOrigin: '90px 92px', '--needle': `${angle.toFixed(1)}deg` } as CSSProperties
        }>
        <path d="M90 92 L90 34" stroke="#ececec" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="90" cy="92" r="7" fill="#282828" stroke="#ececec" strokeWidth="2.5" />
    </svg>
  )
}

export const SampleSizeChip = ({ sample }: { sample: SampleCoverage }) =>
  sample.relevant < SMALL_SAMPLE ? <Chip tone="amber">Small sample</Chip> : null

export const StanceTally = ({
  counts,
  sample,
}: {
  counts: StanceCounts
  sample: SampleCoverage
}) => {
  const total = sample.relevant
  if (total === 0) {
    return (
      <p className="px-3.5 py-3 text-sm text-[#9a9a9a]">
        No post in this sample carried a readable stance.
      </p>
    )
  }
  const headline = stanceHeadline(counts, total)

  return (
    <>
      <div className="flex items-center gap-3.5 px-3.5 pb-1 pt-3">
        <Gauge counts={counts} total={total} label={headline.label} />
        <div className="flex flex-col gap-1">
          <span className="text-11 text-[#9a9a9a]">The sample leans</span>
          <span className={cn('text-[22px] font-semibold leading-[26px]', headline.className)}>
            {headline.label}
          </span>
          {headline.count > 0 && (
            <span className="text-12 text-[#c4c4c4]">
              <span className="tabular-nums">{headline.count}</span> of{' '}
              <span className="tabular-nums">{total}</span> relevant posts
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-3.5 pb-3.5 pt-2.5">
        <div
          className="card-grow flex gap-0.5 overflow-hidden rounded-md"
          style={{ animationDelay: '.3s' }}>
          {SEGMENTS.filter((segment) => counts[segment.key] > 0).map((segment) => (
            <span
              key={segment.key}
              title={`${segment.label}: ${counts[segment.key]} of ${total}`}
              className={cn(
                'h-2.5',
                segment.key === 'unclassified' && 'shadow-[inset_0_0_0_1px_#9a9a9a]'
              )}
              style={{
                width: `${(counts[segment.key] / total) * 100}%`,
                background: segment.color,
              }}
            />
          ))}
        </div>
        <dl className="m-0 grid grid-cols-3 gap-x-4 gap-y-[9px]">
          {SEGMENTS.map((segment) => (
            <div key={segment.key} className="text-12 flex items-center gap-[7px]">
              <span
                aria-hidden
                className={cn(
                  'size-[9px] shrink-0 rounded-[3px]',
                  segment.key === 'unclassified' && 'shadow-[inset_0_0_0_1px_#9a9a9a]'
                )}
                style={{ background: segment.color }}
              />
              <dt className="flex-1 text-[#c4c4c4]">{segment.label}</dt>
              <dd className="m-0 tabular-nums text-[#ececec]">{counts[segment.key]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  )
}

export const SentimentFooter = () => (
  <CardFooter icon={<Info strokeWidth={1.75} />}>
    A tally of stances, not a forecast. Read the posts before the count.
  </CardFooter>
)

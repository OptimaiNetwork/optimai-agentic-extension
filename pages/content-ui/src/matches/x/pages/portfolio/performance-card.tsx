import type { PortfolioHistoryWindow, PortfolioStats } from '@x/services/catalyst'
import { AlertCircle } from 'lucide-react'

import { pnlTone, signedUsd, usdValue } from './format'
import { InfoTip } from './info-tip'
import { PNL_CHART_HEIGHT, PnlChart } from './pnl-chart'
import type { PnlSample } from './pnl-series'

const PERIODS: Array<{ key: PortfolioHistoryWindow; label: string }> = [
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
]

/** What the card needs to draw the line, whatever state its request is in. */
export interface PnlTrendView {
  samples: PnlSample[]
  unpriced: string[]
  isPending: boolean
  isError: boolean
  /** The previous window's line is on screen while this one loads. */
  isStale: boolean
}

const PeriodToggle = ({
  period,
  onChange,
}: {
  period: PortfolioHistoryWindow
  onChange: (next: PortfolioHistoryWindow) => void
}) => (
  <div role="group" aria-label="P&L window" className="flex items-center gap-1">
    {PERIODS.map((option) => (
      <button
        key={option.key}
        type="button"
        aria-pressed={option.key === period}
        onClick={() => onChange(option.key)}
        className={`text-11 rounded-md px-2 py-1 font-medium transition-colors ${
          option.key === period
            ? 'bg-primary/15 text-primary'
            : 'text-faint hover:text-foreground hover:bg-white/5'
        }`}>
        {option.label}
      </button>
    ))}
  </div>
)

const TrendBox = ({ children }: { children: string }) => (
  <p
    className="text-12 text-faint flex items-center justify-center text-center"
    style={{ height: PNL_CHART_HEIGHT }}>
    {children}
  </p>
)

/** The line under the total: how it got there over the window. */
const PnlTrend = ({ trend, period }: { trend: PnlTrendView; period: PortfolioHistoryWindow }) => {
  if (trend.isPending) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading P&L history"
        className="animate-pulse rounded-lg bg-white/[0.04]"
        style={{ height: PNL_CHART_HEIGHT }}
      />
    )
  }
  if (trend.samples.length < 2) {
    return (
      <TrendBox>
        {trend.isError
          ? 'P&L history is unavailable right now.'
          : 'The line starts after your first trade.'}
      </TrendBox>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <PnlChart samples={trend.samples} period={period} dimmed={trend.isStale} />
      {trend.unpriced.length > 0 && (
        <p className="text-11 text-faint leading-snug">
          No past prices for {trend.unpriced.join(', ')}; drawn at the price of the last trade.
        </p>
      )}
    </div>
  )
}

const Metric = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
  <div className="flex min-w-0 flex-col items-center gap-1 px-2 text-center">
    <span className="text-11 text-faint">{label}</span>
    <span className={`text-15 truncate font-semibold tabular-nums ${tone}`}>{value}</span>
  </div>
)

const winRate = (stats: PortfolioStats): string =>
  stats.win_rate_percent == null ? '—' : `${Math.round(Number(stats.win_rate_percent))}%`

const HOLDINGS_NOTE =
  'What your open positions are worth at the live price. Positions without a price are left out.'
const PNL_NOTE =
  'Realized plus unrealized, at average cost, in USD across both chains. Network gas is excluded.'

/** What the book is worth, what it has made, the line that led there and its parts. */
export const PerformanceCard = ({
  stats,
  trend,
  period,
  onPeriod,
}: {
  stats: PortfolioStats
  trend: PnlTrendView
  period: PortfolioHistoryWindow
  onPeriod: (next: PortfolioHistoryWindow) => void
}) => (
  <section
    aria-label="Performance"
    className="bg-surface border-border-soft rounded-16 flex flex-col gap-4 border p-5">
    <div className="grid grid-cols-[minmax(0,1.3fr)_1px_minmax(0,1fr)] items-center gap-5">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-12 text-foreground flex items-center gap-1.5 font-semibold">
          Holdings value
          <InfoTip label="holdings value">{HOLDINGS_NOTE}</InfoTip>
        </span>
        <span className="text-32 text-foreground truncate font-bold tabular-nums leading-none tracking-tight">
          {usdValue(stats.market_value)}
        </span>
      </div>
      <span aria-hidden="true" className="bg-border-soft h-14 w-px" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-12 text-secondary-foreground flex items-center gap-1.5">
          Total P&amp;L
          <InfoTip label="total P&L">{PNL_NOTE}</InfoTip>
        </span>
        <span
          className={`text-24 truncate font-bold tabular-nums leading-none tracking-tight ${pnlTone(stats.total_pnl)}`}>
          {signedUsd(stats.total_pnl)}
        </span>
      </div>
    </div>
    <div className="border-border-soft flex flex-col gap-2 border-t pt-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-11 text-faint">P&amp;L over time</span>
        <PeriodToggle period={period} onChange={onPeriod} />
      </div>
      <PnlTrend trend={trend} period={period} />
    </div>
    <div className="border-border-soft divide-border-soft grid grid-cols-3 divide-x border-t pt-3.5">
      <Metric
        label="Realized P&L"
        value={signedUsd(stats.realized_pnl)}
        tone={pnlTone(stats.realized_pnl)}
      />
      <Metric
        label="Unrealized P&L"
        value={signedUsd(stats.unrealized_pnl)}
        tone={pnlTone(stats.unrealized_pnl)}
      />
      <Metric label="Win rate" value={winRate(stats)} tone="text-foreground" />
    </div>
    {!stats.pnl_complete && (
      <div className="border-border-soft flex items-start gap-2.5 border-t pt-3.5">
        <AlertCircle className="text-warning mt-px size-4 shrink-0" aria-hidden="true" />
        <p className="text-12 text-secondary-foreground leading-relaxed">
          Partial history: some sells have no recorded buy. Realized P&amp;L and win rate cover
          matched tokens only.
        </p>
      </div>
    )}
  </section>
)

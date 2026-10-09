import type { PortfolioHistoryPoint, PortfolioHistoryWindow } from '@x/services/catalyst'

import { signedUsd } from './format'

export interface PnlSample {
  /** Seconds since the epoch, as lightweight-charts wants time. */
  time: number
  pnl: number
  holdings: number
}

/**
 * The server's points as chart samples, one per second at most.
 *
 * The chart refuses two samples at one time, and the live point can land in
 * the same second as the last grid step; the later one is the one to keep.
 */
export const toSamples = (points: readonly PortfolioHistoryPoint[]): PnlSample[] =>
  points
    .map((point) => ({
      time: Math.floor(Date.parse(point.at) / 1000),
      pnl: Number(point.total_pnl),
      holdings: Number(point.market_value),
    }))
    .filter((sample) => Number.isFinite(sample.time) && Number.isFinite(sample.pnl))
    .reduce<PnlSample[]>((kept, sample) => {
      const last = kept.at(-1)
      if (last && sample.time <= last.time) return [...kept.slice(0, -1), sample]
      return [...kept, sample]
    }, [])

const WINDOW_WORDS: Record<PortfolioHistoryWindow, string> = {
  '24h': 'the last 24 hours',
  '7d': 'the last 7 days',
  '30d': 'the last 30 days',
}

const money = (value: number): string => signedUsd(String(value))

/**
 * What the line says, in words, for a screen reader: the canvas has no text.
 */
export const describeLine = (
  samples: readonly PnlSample[],
  period: PortfolioHistoryWindow
): string => {
  if (samples.length < 2)
    return `Total P&L over ${WINDOW_WORDS[period]}: not enough points to draw.`
  const values = samples.map((sample) => sample.pnl)
  return [
    `Total P&L over ${WINDOW_WORDS[period]}`,
    `from ${money(values[0])} to ${money(values[values.length - 1])}`,
    `high ${money(Math.max(...values))}, low ${money(Math.min(...values))}.`,
  ].join(', ')
}

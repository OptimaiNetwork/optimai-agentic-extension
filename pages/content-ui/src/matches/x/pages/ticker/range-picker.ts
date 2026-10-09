/**
 * The windows the chart can show, and the candles each one is made of.
 *
 * Fine enough that a day is a line rather than 24 steps: 5-minute candles for
 * a day, 15-minute for a week (Binance has no 30m), hourly for a month. The
 * server pages Binance past its 300-row cap, up to 720 candles. There is no
 * 90-day window: under that ceiling it could only be 4-hour candles, the same
 * blocky line this change is here to remove.
 */

export interface ChartRange {
  key: '24h' | '7d' | '30d'
  label: string
  interval: string
  limit: number
}

export const CHART_RANGES: readonly ChartRange[] = [
  { key: '24h', label: '24h', interval: '5m', limit: 288 },
  { key: '7d', label: '7d', interval: '15m', limit: 672 },
  { key: '30d', label: '30d', interval: '1h', limit: 720 },
]

/** 24h, because it is the window the change beside the price is measured over. */
export const DEFAULT_RANGE = CHART_RANGES[0]

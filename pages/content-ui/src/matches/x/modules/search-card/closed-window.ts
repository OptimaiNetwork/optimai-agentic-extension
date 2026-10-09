import type { Candle } from '@x/services/catalyst'

export interface ClosedWindow {
  hours: number
  low: number
  high: number
  rangePercent: number
  volume: number
  netPercent: number
}

/**
 * What the token did while the exchange was shut.
 *
 * Only the most recent run of closed hours, not every closed hour in the series:
 * the claim being made is about the stretch X's card is currently drawing as
 * flat, and stitching in last week's weekend would make the number bigger and
 * the claim false.
 */
export const closedWindowOf = (candles: Candle[]): ClosedWindow | null => {
  // Only when the series still ends shut. Mid-session the most recent closed run
  // is last night's, and reporting it made the card announce "the US market has
  // been shut for 18 hours" beside X's own card ticking live.
  const end = candles.length - 1
  if (end < 0 || candles[end].session !== 'closed') return null

  let start = end
  while (start > 0 && candles[start - 1].session === 'closed') start -= 1
  // The run reaching the start of the window means the closure began before it,
  // so its length and its opening price are both unknown. Saying "shut for 48
  // hours" when it has been 65, against a price from the wrong moment, is worse
  // than saying nothing.
  if (start === 0) return null

  const run = candles.slice(start, end + 1)
  if (run.length < 2) return null

  const low = Math.min(...run.map((candle) => Number(candle.low)))
  const high = Math.max(...run.map((candle) => Number(candle.high)))
  const first = Number(run[0].open)
  const last = Number(run[run.length - 1].close)
  const volume = run.reduce((total, candle) => total + Number(candle.volume), 0)

  return {
    hours: run.length,
    low,
    high,
    rangePercent: low > 0 ? ((high - low) / low) * 100 : 0,
    volume,
    // The net move is usually small and the range usually is not. Both are
    // reported, because quoting only the range would overstate it and quoting
    // only the net would hide that anything happened at all.
    netPercent: first > 0 ? ((last - first) / first) * 100 : 0,
  }
}

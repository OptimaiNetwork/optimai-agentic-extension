import type { Candle } from '@x/services/catalyst'

/** X's own green and red, so the chart reads like the card X draws beside it. */
export const UP_COLOUR = '#00ba7c'
export const DOWN_COLOUR = '#f4212e'

/**
 * The one colour a chart is drawn in: green when the window closes at or above
 * where it opened, red when below — the way X colours its own card, rather than
 * green above the first close and red under it, which split one move into two.
 */
export const trendColour = (candles: readonly Candle[]): string => {
  if (candles.length < 2) return UP_COLOUR
  const first = Number(candles[0].close)
  const last = Number(candles[candles.length - 1].close)
  return last >= first ? UP_COLOUR : DOWN_COLOUR
}

/** `#00ba7c` at 0.3 → `rgba(0, 186, 124, 0.3)`, for the fill under the line. */
export const withAlpha = (hex: string, alpha: number): string => {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

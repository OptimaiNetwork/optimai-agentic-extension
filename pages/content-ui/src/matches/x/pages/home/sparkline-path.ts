/**
 * The geometry behind a sparkline, with no React in it.
 *
 * Separate from the component because `vitest.config.ts` in this workspace is
 * deliberately `src/**\/*.test.ts` and "pure functions only — anything needing a
 * browser belongs in tests/e2e". The arithmetic is the part that can be wrong;
 * the `<polyline>` around it cannot.
 */

export const SPARKLINE_WIDTH = 56
export const SPARKLINE_HEIGHT = 20
/** Keeps the stroke off the box edge, so a flat line is not clipped in half. */
const PADDING = 2

/**
 * A token that barely traded gets a flat line, and that is the honest picture —
 * MUB moved $4,207 in a day. But a *single* point is not a line at all, and two
 * identical points is a horizontal rule that reads as a rendering bug rather
 * than as stillness.
 */
export const MINIMUM_POINTS = 3

/**
 * `points` for an SVG polyline, or null when there is not enough of a day.
 */
export const sparklinePath = (values: readonly string[] | null | undefined): string | null => {
  const points = (values ?? []).map(Number).filter(Number.isFinite)
  if (points.length < MINIMUM_POINTS) return null

  const low = Math.min(...points)
  const high = Math.max(...points)
  const span = high - low
  const usable = SPARKLINE_HEIGHT - PADDING * 2

  return points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * SPARKLINE_WIDTH
      // A day with no movement has span 0, and dividing by it puts every point
      // at NaN — which renders nothing and reads as missing data rather than as
      // a token that did not move. Centred is the truthful answer.
      const y =
        span === 0 ? SPARKLINE_HEIGHT / 2 : PADDING + usable - ((value - low) / span) * usable
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

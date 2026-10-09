import { sparklinePath, SPARKLINE_HEIGHT, SPARKLINE_WIDTH } from './sparkline-path'

/**
 * A day of a token's price, as one line.
 *
 * Inline SVG rather than a chart library. The panel already carries
 * lightweight-charts for the ticker page, but that draws with a canvas and its
 * own animation loop per instance — seventy-seven of those in a scrolling list
 * is seventy-seven canvases and seventy-seven rAF loops for a picture with no
 * axes, no tooltip and no interaction. A `<polyline>` is a string.
 *
 * It also sidesteps the constraint that shaped the logos: an inline SVG is not
 * a resource, so x.com's `img-src` never sees it.
 */
export const Sparkline = ({
  values,
  positive,
}: {
  values: readonly string[] | null | undefined
  positive: boolean
}) => {
  const points = sparklinePath(values)
  if (points === null) {
    // Hold the column's width so the rows below do not step sideways.
    return <span className="block" style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }} />
  }

  return (
    <svg
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      role="img"
      aria-label={`24 hour price trend, ${positive ? 'up' : 'down'}`}
      className="flex-shrink-0 overflow-visible">
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        // Coloured by the 24h change, not by the line: a token can close above
        // where the window opened while the reported figure is negative, and
        // the line must never disagree with the number beside it.
        className={positive ? 'stroke-positive' : 'stroke-destructive'}
      />
    </svg>
  )
}

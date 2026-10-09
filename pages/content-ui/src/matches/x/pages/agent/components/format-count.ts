/**
 * Compact metric counts, the way X prints them.
 *
 * The empty string for a falsy value is the important part, not an oversight:
 * X hides a count of zero rather than printing `0`, and a row of zeroes reads
 * as a dead post when it is really an unengaged one.
 */
export function compactNumber(value?: number): string {
  if (!value) return ''
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${trim(value / 1000)}K`
  return `${trim(value / 1_000_000)}M`
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '')
}

/**
 * The older label-bearing formatter, kept for the profile stat row where a
 * zero is a real reading ("4 following") rather than something to hide.
 */
export function formatCount(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}K`
  return `${(value / 1_000_000).toFixed(1)}M`
}

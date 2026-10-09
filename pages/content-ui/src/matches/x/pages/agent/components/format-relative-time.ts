const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/**
 * X-style compact age for a timestamp: `now`, `5m`, `3h`, `2d`, then a short
 * date once a post is over a week old (`Sep 8`, or `Sep 8, 2025` across a
 * year boundary). Returns `undefined` for an unparsable input so callers can
 * omit the `<time>` rather than print `Invalid Date`.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string | undefined {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return undefined
  const age = now - then
  if (age < MINUTE) return 'now'
  if (age < HOUR) return `${Math.floor(age / MINUTE)}m`
  if (age < DAY) return `${Math.floor(age / HOUR)}h`
  if (age < WEEK) return `${Math.floor(age / DAY)}d`
  const date = new Date(then)
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** Full, unambiguous timestamp for `title` / screen readers. */
export function formatAbsoluteTime(iso: string): string | undefined {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return undefined
  return new Date(then).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

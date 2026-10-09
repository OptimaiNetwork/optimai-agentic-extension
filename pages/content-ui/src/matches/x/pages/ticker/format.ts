/**
 * The server sends every number as a string so nothing is lost to a float on the
 * way. Parsing happens here, at the last possible moment, for display only.
 */
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatUsd = (value: string | null | undefined): string =>
  value == null ? '—' : usd.format(Number(value))

export const formatPercent = (value: string | null | undefined, places = 2): string => {
  if (value == null) return '—'
  const number = Number(value)
  return `${number >= 0 ? '+' : ''}${number.toFixed(places)}%`
}

export const formatMultiplier = (value: string): string => Number(value).toFixed(6)

/**
 * A multiplier this close to 1 tells the user nothing, and showing it invites
 * them to read a rounding artefact as a discrepancy.
 */
export const MULTIPLIER_WORTH_SHOWING = 0.0001

export const isMultiplierMeaningful = (value: string): boolean =>
  Math.abs(Number(value) - 1) >= MULTIPLIER_WORTH_SHOWING

/**
 * `$4.94M`, for a figure whose magnitude is the point and whose cents are not.
 *
 * Lives here rather than in the two cards that want it. Liquidity and market
 * cap are formatted identically and were drifting apart in two private copies.
 */
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 })

export const formatCompactUsd = (value: string | number | null | undefined): string => {
  const parsed = value == null ? NaN : Number(value)
  return Number.isFinite(parsed) ? `$${compact.format(parsed)}` : '\u2014'
}

export const formatCompact = (value: string | number | null | undefined): string => {
  const parsed = value == null ? NaN : Number(value)
  return Number.isFinite(parsed) ? compact.format(parsed) : '\u2014'
}

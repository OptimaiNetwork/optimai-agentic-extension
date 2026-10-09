import type { PortfolioChain, PortfolioVenue } from '@x/services/catalyst'

export const CHAIN_NAME: Record<PortfolioChain, string> = { bnb: 'BNB Chain', solana: 'Solana' }
export const CHAIN_SHORT: Record<PortfolioChain, string> = { bnb: 'BNB', solana: 'SOL' }
export const VENUE_LABEL: Record<PortfolioVenue, string> = {
  bstock: 'bStocks',
  ondo: 'Ondo',
  prestock: 'PreStocks',
}

const EXPLORERS: Record<PortfolioChain, { name: string; tx: (id: string) => string }> = {
  bnb: { name: 'BscScan', tx: (id) => `https://bscscan.com/tx/${id}` },
  solana: { name: 'Solscan', tx: (id) => `https://solscan.io/tx/${id}` },
}

export const explorerFor = (chain: PortfolioChain) => EXPLORERS[chain]

/** How the server's `logos` map names a token. */
export const logoKey = (chain: PortfolioChain, tokenAddress: string): string =>
  `${chain}:${tokenAddress}`

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const tokens = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
})
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 })
const stable = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// The server sends numbers as strings so nothing is lost on the way; they
// become floats here, for display only.
const toNumber = (value: string | null | undefined): number | null => {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const usdValue = (value: string | null | undefined): string => {
  const n = toNumber(value)
  return n == null ? '—' : usd.format(n)
}

/** A P&L with its sign spelled out, so a loss never reads as a price: +$2.42, −$1.52. */
export const signedUsd = (value: string | null | undefined): string => {
  const n = toNumber(value)
  if (n == null) return '—'
  if (Math.abs(n) < 0.005) return usd.format(0)
  return `${n > 0 ? '+' : '−'}${usd.format(Math.abs(n))}`
}

export const signedPercent = (value: string | null | undefined, places = 2): string => {
  const n = toNumber(value)
  if (n == null) return '—'
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(places)}%`
}

export const sharePercent = (value: number): string => `${value.toFixed(1)}%`

const compact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** A total small enough for the donut's centre: $8.80K, and $1.19 as it is. */
export const compactUsd = (value: string | null | undefined): string => {
  const n = toNumber(value)
  if (n == null) return '—'
  return Math.abs(n) < 1000 ? usd.format(n) : compact.format(n)
}

export const quantity = (value: string | null | undefined): string => {
  const n = toNumber(value)
  return n == null ? '—' : tokens.format(n)
}

export const plainAmount = (value: string | null | undefined): string => {
  const n = toNumber(value)
  return n == null ? '—' : plain.format(n)
}

/** A stablecoin amount, always to the cent: 64.80 USDC, not 64.8. */
export const stableAmount = (value: string | null | undefined): string => {
  const n = toNumber(value)
  return n == null ? '—' : stable.format(n)
}

export const pnlTone = (value: string | null | undefined): string => {
  const n = toNumber(value)
  if (n == null) return 'text-faint'
  if (n > 0) return 'text-positive'
  if (n < 0) return 'text-destructive'
  return 'text-foreground'
}

export const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 's'}`

const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const monthDayYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export const timeLabel = (date: Date): string =>
  Number.isNaN(date.getTime()) ? '—' : clock.format(date)

const dayLabel = (date: Date, now: Date): string => {
  if (Number.isNaN(date.getTime())) return 'Time unavailable'
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (sameDay(date, now)) return `Today · ${monthDay.format(date)}`
  if (sameDay(date, yesterday)) return `Yesterday · ${monthDay.format(date)}`
  return date.getFullYear() === now.getFullYear()
    ? monthDay.format(date)
    : monthDayYear.format(date)
}

/** Consecutive items under one heading per local day; order is kept as given. */
export const groupByDay = <T>(
  items: readonly T[],
  dateOf: (item: T) => Date,
  now = new Date()
): Array<{ label: string; items: T[] }> =>
  items.reduce<Array<{ label: string; items: T[] }>>((groups, item) => {
    const label = dayLabel(dateOf(item), now)
    const last = groups.at(-1)
    return last?.label === label
      ? [...groups.slice(0, -1), { label, items: [...last.items, item] }]
      : [...groups, { label, items: [item] }]
  }, [])

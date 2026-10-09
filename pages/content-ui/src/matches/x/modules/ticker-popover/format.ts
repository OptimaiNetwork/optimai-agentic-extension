const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const compactCount = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** `$100.4K`: the popover's cells are narrow, and the cents are not the point. */
export const formatCompactUsd = (value: string | null | undefined): string => {
  const parsed = value == null ? NaN : Number(value)
  return Number.isFinite(parsed) ? compactUsd.format(parsed) : '—'
}

export const formatCount = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? '—' : compactCount.format(value)

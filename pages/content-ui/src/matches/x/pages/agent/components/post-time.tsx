import { formatAbsoluteTime, formatRelativeTime } from './format-relative-time'

/** Compact age with the full timestamp on hover and for assistive tech. */
export function PostTime({
  iso,
  className,
}: {
  iso: string
  className?: string
}): React.JSX.Element | null {
  const relative = formatRelativeTime(iso)
  const absolute = formatAbsoluteTime(iso)
  if (!relative || !absolute) return null
  return (
    <time dateTime={iso} title={absolute} aria-label={absolute} className={className}>
      {relative}
    </time>
  )
}

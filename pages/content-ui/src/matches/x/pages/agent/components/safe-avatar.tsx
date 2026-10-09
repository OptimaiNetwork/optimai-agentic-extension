import { Avatar, AvatarFallback, AvatarImage, cn } from '@extension/ui'

import { DefaultAvatarIcon } from './x-icons'

// Avatar sizes: `size-8` base, `size-6` small, `size-10` large. `lg` was
// 36px here, which narrowed every full post card's avatar column by 4px and
// moved where the text wraps.
const SIZES = { sm: 'size-6', default: 'size-8', lg: 'size-10' } as const

/**
 * Enforces an allowlist: https only, X's own media host, and no embedded
 * credentials. Anything else renders as `undefined` so the caller falls back
 * to the silhouette instead of the image.
 *
 * This matters because
 * this runs inside x.com, and these URLs come out of posts the collector read
 * off a page — an unchecked `src` is an outbound request to wherever a post
 * author chose, made from the user's logged-in session.
 */
export function safeAvatarUrl(value?: string | null): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      url.hostname === 'pbs.twimg.com' &&
      !url.username &&
      !url.password
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

/**
 * A round avatar with a safe-URL image, falling back to X's own default
 * profile picture.
 *
 * Not initials. A common avatar component falls back to two letters, which is
 * a fine product choice in many apps and the wrong one here: X renders a grey silhouette, and three rows reading "GR"
 * down a candidate list is the loudest possible signal that a card is not
 * showing a real timeline.
 */
export function SafeAvatar({
  url,
  name,
  size = 'sm',
  className,
}: {
  url?: string | null
  name: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
}): React.JSX.Element {
  // A typical Avatar primitive carries a `size` variant; this repo's Radix
  // wrapper does not, so the size is applied as a class instead of a prop.
  return (
    <Avatar className={cn('shrink-0', SIZES[size], className)}>
      <AvatarImage src={safeAvatarUrl(url)} alt="" referrerPolicy="no-referrer" />
      <AvatarFallback
        aria-label={`${name} has no profile picture`}
        className="overflow-hidden bg-transparent p-0">
        <DefaultAvatarIcon className="text-foreground size-full" />
      </AvatarFallback>
    </Avatar>
  )
}

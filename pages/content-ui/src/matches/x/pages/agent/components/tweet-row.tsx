import type { ReactNode } from 'react'

import { cn } from '@extension/ui'

import { SafeAvatar } from './safe-avatar'
import { VerifiedIcon } from './x-icons'

/**
 * The avatar-and-identity row every post and profile sits under: avatar in
 * a fixed left column, then the display name in bold, the verified badge, and
 * `@handle · time` as one muted run.
 *
 * The badge is `x-verified` and nothing else in the app uses that colour. It is
 * X's blue because the badge belongs to X, and colouring it with this product's
 * accent would read as this product vouching for the account. It does not: the
 * badge is a subscription marker, which is why `title` says so.
 */
export function TweetRow({
  avatarUrl,
  displayName,
  handle,
  verified,
  timeLabel,
  gutter,
  avatarSize = 'lg',
  connector = false,
  className,
  children,
}: {
  avatarUrl?: string | null
  displayName: string
  handle?: string
  verified?: boolean
  timeLabel?: ReactNode
  gutter?: ReactNode
  avatarSize?: 'sm' | 'default' | 'lg'
  /**
   * Runs a hairline from under the avatar to the bottom of the row, so a post
   * and the post answering it read as one exchange. It lives in the avatar
   * column and grows with the row, which is the only way it ends exactly where
   * the next avatar begins — an absolutely positioned rail has to guess.
   */
  connector?: boolean
  className?: string
  children?: ReactNode
}): React.JSX.Element {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="flex shrink-0 flex-col items-center">
        <SafeAvatar url={avatarUrl} name={displayName} size={avatarSize} />
        {connector ? <span aria-hidden className="bg-border-strong mt-1 w-px flex-1" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <span className="text-foreground min-w-0 max-w-full truncate font-bold">
            {displayName}
          </span>
          {verified ? (
            <VerifiedIcon className="text-x-verified size-3.5 shrink-0" aria-label="Verified" />
          ) : null}
          {handle ? <span className="text-faint truncate text-sm">@{handle}</span> : null}
          {handle && timeLabel ? (
            <span aria-hidden className="text-faint text-sm">
              ·
            </span>
          ) : null}
          {timeLabel}
          {gutter ? (
            <span className="ml-auto flex shrink-0 items-center gap-1.5">{gutter}</span>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  )
}

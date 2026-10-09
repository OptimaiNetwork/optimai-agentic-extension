import type { ResearchPostSnapshot } from '@extension/shared'
import { cn } from '@extension/ui'

import { PostTime } from './post-time'
import { SafeAvatar } from './safe-avatar'
import { VerifiedIcon } from './x-icons'

/**
 * The post a quote post quotes, as X renders it: a bordered box inset under the
 * quoting text, with a small avatar on the same line as the name, handle and
 * time. *
 * A box rather than a rail, because a quote is not a chain. The quoted post is
 * embedded inside the new one, not answered by it, and the frame is what says
 * so at a glance.
 *
 * Two design choices. A desktop app would open the quote through a native
 * bridge; here the whole box is a plain external link, and
 * the URL has already been through `isSafeHttpUrl` in the card validator.
 *
 * The second matters more: the upstream design takes an `XPostSummary` that its collector
 * always fills. This takes the snapshot the server actually stored, and the
 * server only stores a quoted post when the collector **read** one. So this
 * renders `null` rather than a placeholder when there is nothing — an empty
 * quote box would be the card inventing a post that was never observed, which
 * is the one thing an evidence card must not do.
 */
export const QuotedPost = ({
  post,
  className,
}: {
  post: ResearchPostSnapshot | null | undefined
  className?: string
}) => {
  if (!post) return null

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Quoted post by ${post.author.name || post.author.handle}`}
      className={cn(
        'block rounded-xl border border-white/10 p-2.5 transition-colors hover:bg-white/[0.03]',
        className
      )}>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <SafeAvatar url={post.author.avatarUrl} name={post.author.name} size="sm" />
        <span className="text-foreground truncate text-sm font-medium">{post.author.name}</span>
        {post.author.verified ? <VerifiedIcon className="text-x-verified size-3 shrink-0" /> : null}
        <span className="text-faint truncate text-sm">@{post.author.handle}</span>
        {post.publishedAt ? (
          <>
            <span aria-hidden className="text-xxs text-faint">
              ·
            </span>
            <PostTime iso={post.publishedAt} className="text-faint text-sm" />
          </>
        ) : null}
      </div>
      <p className="text-faint mt-1 line-clamp-4 break-words text-sm leading-5">{post.text}</p>
    </a>
  )
}

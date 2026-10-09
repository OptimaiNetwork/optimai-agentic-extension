import type { CSSProperties } from 'react'
import type { XPostSummary } from './view-contract'

import { cn } from '@extension/ui'

import { OPENABLE_CLASS, openOnXProps } from './open-on-x'
import { PostTime } from './post-time'
import { TweetRow } from './tweet-row'

const STAGGER_MS = 40

/**
 * A click-through post row shared by `XPostListCard` and `XThreadCard`'s reply
 * rows — the compact counterpart to `XPostBody`, built on the same `TweetRow`
 * so a name, a badge and a handle sit in the same places in both. Never shows
 * `post.id`, matching every other card in this directory.
 */
export function CompactPostRow({
  post,
  index = 0,
  className,
}: {
  post: XPostSummary
  index?: number
  className?: string
}): React.JSX.Element {
  return (
    <div
      {...openOnXProps(post.url, `Post by ${post.author.name}`)}
      style={{ animationDelay: `${index * STAGGER_MS}ms` } as CSSProperties}
      className={cn(
        'animate-artifact-rise p-4 motion-reduce:animate-none',
        OPENABLE_CLASS,
        className
      )}>
      <TweetRow
        avatarUrl={post.author.avatarUrl}
        displayName={post.author.name}
        handle={post.author.handle}
        verified={post.author.verified}
        avatarSize="default"
        timeLabel={
          post.createdAt ? <PostTime iso={post.createdAt} className="text-faint text-sm" /> : null
        }>
        <p className="text-faint mt-0.5 line-clamp-2 break-words text-sm leading-5">{post.text}</p>
      </TweetRow>
    </div>
  )
}

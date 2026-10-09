import type { XPostSummary } from './view-contract'

import { cn } from '@extension/ui'

import { ArtifactShell } from './artifact-shell'
import { OPENABLE_CLASS, openOnXProps } from './open-on-x'
import { PostText } from './post-text'
import { PostTime } from './post-time'
import { TweetRow } from './tweet-row'

/**
 * The full post markup shared by `XPostCard` and `XThreadCard`'s root row.
 * Deliberately never shows `post.id` — an internal identifier no reader wants,
 * and the exact thing this feature exists to stop the agent from transcribing
 * into text. Not wrapped in `ArtifactShell` so callers can nest it inside their
 * own shell without doubling up the card frame.
 *
 * The whole body is the control that opens the post, which is why there is no
 * link underneath it. See `openOnXProps` for why it is a `role="button"` div.
 */
export function XPostBody({
  post,
  className,
}: {
  post: XPostSummary
  className?: string
}): React.JSX.Element {
  return (
    <div
      {...openOnXProps(post.url, `Post by ${post.author.name}`)}
      className={cn('p-4', OPENABLE_CLASS, className)}>
      <TweetRow
        avatarUrl={post.author.avatarUrl}
        displayName={post.author.name}
        handle={post.author.handle}
        verified={post.author.verified}
        timeLabel={
          post.createdAt ? <PostTime iso={post.createdAt} className="text-faint text-sm" /> : null
        }>
        <PostText className="mt-1" text={post.text} />
      </TweetRow>
    </div>
  )
}

/** Renders a single X post as prose readers can act on. See `XPostBody`. */
export function XPostCard({ data }: { data: { post: XPostSummary } }): React.JSX.Element {
  const { post } = data
  return (
    <ArtifactShell label={`Post by ${post.author.name}`}>
      <XPostBody post={post} />
    </ArtifactShell>
  )
}

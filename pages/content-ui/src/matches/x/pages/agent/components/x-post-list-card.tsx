import type { XPostSummary } from './view-contract'
import { SearchX } from 'lucide-react'

import { ArtifactShell } from './artifact-shell'
import { CompactPostRow } from './compact-post-row'

const MAX_VISIBLE_ROWS = 5

/**
 * Renders a bounded list of X posts — a search result set or a user's recent
 * posts. Shows at most `MAX_VISIBLE_ROWS` rows plus an "N more" line: the
 * smallest presentation that conveys the result, not an exhaustive dump.
 */
export function XPostListCard({
  data,
}: {
  data: { posts: XPostSummary[]; query?: string; handle?: string; empty: boolean }
}): React.JSX.Element {
  const { posts, query, handle, empty } = data
  const header = query ? `Results for "${query}"` : handle ? `Posts from @${handle}` : 'Posts'
  const visiblePosts = posts.slice(0, MAX_VISIBLE_ROWS)
  const hiddenCount = posts.length - visiblePosts.length

  if (empty) return <EmptyList header={header} query={query} handle={handle} />

  return (
    <ArtifactShell label={header}>
      <div className="flex flex-col">
        <p className="text-foreground px-4 pb-1 pt-3 text-sm font-semibold">{header}</p>
        <div className="divide-border-soft border-border-soft divide-y border-t">
          {visiblePosts.map((post, index) => (
            <CompactPostRow key={post.id} post={post} index={index} />
          ))}
        </div>
        {hiddenCount > 0 ? (
          <p className="border-border-soft text-faint border-t px-4 py-2.5 text-sm">
            {hiddenCount} more not shown
          </p>
        ) : null}
      </div>
    </ArtifactShell>
  )
}

/**
 * An empty search is a real observation, so it gets a composed state rather
 * than the ordinary header with a sentence of apology under it. It must never
 * be omitted: silence here would leave the prose claiming a search the UI does
 * not show.
 *
 * Deliberately not an error. Nothing is red and nothing is a warning triangle.
 *
 * Two lines, and no more: the one thing a reader has to check is whether the
 * agent searched what they meant, so the subject is the payload and every
 * further word would be filler on a card that found nothing.
 *
 * "No results for" is X's own wording for this state. It does say the outcome
 * a second time after the title, which is the cost of matching the phrasing a
 * reader already knows from X itself.
 */
function EmptyList({
  header,
  query,
  handle,
}: {
  header: string
  query?: string
  handle?: string
}): React.JSX.Element {
  const detail = query
    ? `No results for "${query}"`
    : handle
      ? `No results for @${handle}`
      : 'No results'
  return (
    <ArtifactShell label={header}>
      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        <SearchX aria-hidden className="text-faint size-7" strokeWidth={1.5} />
        <div className="flex w-full flex-col gap-1">
          <p className="text-foreground text-sm font-semibold">No posts matched</p>
          {/* One line, always. `truncate` rather than a wrap: a query long
              enough to overflow is better clipped, with the whole of it on the
              element's title, than allowed to push the card taller. */}
          <p title={detail} className="text-faint truncate text-sm">
            {detail}
          </p>
        </div>
      </div>
    </ArtifactShell>
  )
}

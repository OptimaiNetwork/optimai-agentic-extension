import type { AgentMessage } from '@x/modules/agent-conversation'
import type { Citation } from '@x/services/agent'
import { VENUES, VENUE_IDS, isSafeHttpUrl, type VenueId } from '@extension/shared'
import { cn } from '@extension/ui'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { useState } from 'react'

import { PostTime } from './post-time'
import { TokenMark, VenuePlate } from './research-card-shell'
import { SafeAvatar } from './safe-avatar'
import { XLogoIcon } from './x-icons'

/**
 * The sources an answer stands on, folded into a chip.
 *
 * A reader who wants to check a number opens it; everyone else sees a count
 * and up to three faces. Open, every source is a two-line row: what it is, in
 * the words the server used, and underneath the kind of evidence and how long
 * ago it was read. The plate at the left says the same thing without words —
 * the author's face for a post, the issuer's mark or the token's logo for a
 * quote — so a list of five reads as five things rather than five dots.
 *
 * A citation carries only a title. What it points at is worked out here from
 * the message it belongs to: a post's author is in whichever card collected
 * it, keyed by the same source id, and a quote's venue and ticker are in the
 * title the server wrote for it.
 */

type SourceAuthor = { name: string; avatarUrl?: string | null }

export const authorsBySource = (parts: AgentMessage['parts']): Map<string, SourceAuthor> => {
  const authors = new Map<string, SourceAuthor>()
  for (const part of parts ?? []) {
    if (part.kind !== 'card' || !('posts' in part.card)) continue
    for (const post of part.card.posts) {
      if (post.sourceId) {
        authors.set(post.sourceId, {
          name: post.author.name || post.author.handle,
          avatarUrl: post.author.avatarUrl,
        })
      }
    }
  }
  return authors
}

const KIND_LABEL: Record<Citation['kind'], string> = {
  x_post: 'Post on X',
  market_data: 'Market data',
  issuer_data: 'Issuer data',
}

/** `bStocks · BNB Chain quote · NVDA` → the venue and the ticker, if the title names them. */
const readQuoteTitle = (title: string): { venue?: VenueId; ticker?: string } => {
  const venue = VENUE_IDS.find((id) =>
    title.toLowerCase().startsWith(VENUES[id].label.toLowerCase())
  )
  const ticker = /(?:^|[·\s(])\$?([A-Z]{1,6})\)?\s*$/.exec(title)?.[1]
  return { venue, ticker }
}

const Plate = ({
  source,
  author,
  size = 'md',
  className,
}: {
  source: Citation
  author?: SourceAuthor
  size?: 'sm' | 'md'
  className?: string
}) => {
  const box = size === 'sm' ? 'size-3.5' : 'size-7'

  if (source.kind === 'x_post') {
    return author ? (
      <SafeAvatar
        url={author.avatarUrl}
        name={author.name}
        size="sm"
        className={cn(box, className)}
      />
    ) : (
      <span
        aria-hidden
        className={cn(
          'text-foreground flex shrink-0 items-center justify-center rounded-full bg-black',
          box,
          className
        )}>
        <XLogoIcon className={size === 'sm' ? 'size-2' : 'size-3'} />
      </span>
    )
  }

  const { venue, ticker } = readQuoteTitle(source.title)
  if (size === 'md' && ticker) {
    return (
      <span className={cn('flex shrink-0 [&>*]:size-7', className)}>
        <TokenMark ticker={ticker} venue={venue} />
      </span>
    )
  }
  if (venue) {
    return (
      <VenuePlate
        venue={venue}
        className={cn(box, size === 'sm' ? '[&_svg]:size-2' : '[&_svg]:size-3.5', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 rounded-full',
        source.kind === 'market_data' ? 'bg-amber-400' : 'bg-brand',
        box,
        className
      )}
    />
  )
}

const SourceRow = ({ source, author }: { source: Citation; author?: SourceAuthor }) => {
  const safe = isSafeHttpUrl(source.url) ? source.url : undefined
  const body = (
    <>
      <Plate source={source} author={author} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-13 text-foreground truncate font-medium leading-[17px]">
          {source.title}
        </span>
        <span className="text-11 text-faint truncate leading-[14px]">
          {KIND_LABEL[source.kind]}
          {' · '}
          <PostTime iso={source.observed_at} />
        </span>
      </span>
      {safe && <ExternalLink className="text-faint size-[13px] shrink-0" />}
    </>
  )
  const className = 'flex items-center gap-2.5 px-3 py-2'
  return safe ? (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(className, 'transition-colors hover:bg-white/[0.03]')}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  )
}

export const SourcesChip = ({
  sources,
  parts,
}: {
  sources: Citation[]
  parts: AgentMessage['parts']
}) => {
  const [open, setOpen] = useState(false)
  const authors = authorsBySource(parts)
  // Three plates at most on the closed chip: the first authors, then one per
  // remaining kind, so the chip says who and what without becoming a list.
  const preview = sources
    .filter((source, index, all) =>
      authors.has(source.source_id)
        ? true
        : all.findIndex((other) => !authors.has(other.source_id) && other.kind === source.kind) ===
          index
    )
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="text-12 border-border-soft text-faint hover:text-foreground hover:border-border-strong flex h-7 items-center gap-1.5 self-start rounded-full border pl-2 pr-2.5 leading-4 transition-colors">
        <span className="flex">
          {preview.map((source, index) => (
            <Plate
              key={source.source_id}
              source={source}
              author={authors.get(source.source_id)}
              size="sm"
              className={cn('border-background border-[1.5px]', index > 0 && '-ml-1.5')}
            />
          ))}
        </span>
        <span>
          {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        </span>
        <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ol className="border-border-soft divide-border-soft flex flex-col divide-y overflow-hidden rounded-xl border bg-white/[0.02]">
          {sources.map((source) => (
            <li key={source.source_id}>
              <SourceRow source={source} author={authors.get(source.source_id)} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

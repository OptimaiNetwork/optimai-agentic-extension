import type { ResearchPostSnapshot, Stance, StanceAnnotation } from '@extension/shared'
import { cn } from '@extension/ui'
import { useQuote } from '@x/queries/catalyst/use-quote'
import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'
import { ChevronDown } from 'lucide-react'
import { Fragment, useState } from 'react'

import { CardToken, usd } from './card-kit'
import { OPENABLE_CLASS, openOnXProps } from './open-on-x'
import { PostTime } from './post-time'
import { SafeAvatar } from './safe-avatar'
import { VerifiedIcon } from './x-icons'

/**
 * The posts behind a finding, as rows a reader can open on X.
 *
 * Each row is one post: avatar, name, `@handle · age`, the stance pill at the
 * right edge of that line when the post was classified, the text with its
 * cashtags in X's blue, and the token the post is about as a chip with its
 * logo and current price, so a claim sits next to the number it is about.
 *
 * Three rows by default. A finding is rarely changed by the fourth post, and
 * the rest are one tap away.
 */
const DEFAULT_VISIBLE = 3

const STANCE_STYLE: Record<Stance, string> = {
  bullish: 'bg-[rgba(94,237,135,0.12)] text-[#5eed87]',
  bearish: 'bg-[rgba(255,138,122,0.12)] text-[#ff8a7a]',
  neutral: 'bg-white/10 text-[#c4c4c4]',
  mixed: 'bg-[rgba(255,176,0,0.12)] text-[#ffb000]',
  uncertain: 'bg-white/10 text-[#9a9a9a]',
  unclassified: 'border border-[#3d3d3d] bg-transparent text-[#9a9a9a]',
}

const STANCE_LABEL: Record<Stance, string> = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  neutral: 'Neutral',
  mixed: 'Mixed',
  uncertain: 'Uncertain',
  unclassified: 'Unread',
}

const STAGGER_S = 0.12
const CASHTAG = /(\$[A-Za-z]{1,6}\b)/g

/** The post's text with each cashtag in X's blue. Text only, never markup. */
const PostText = ({ text }: { text: string }) => (
  <p className="text-13 m-0 line-clamp-3 break-words leading-[18px] text-[#c4c4c4]">
    {text.split(CASHTAG).map((piece, index) =>
      index % 2 === 1 ? (
        <span key={index} className="text-[#1d9bf0]">
          {piece}
        </span>
      ) : (
        <Fragment key={index}>{piece}</Fragment>
      )
    )}
  </p>
)

/** The token a post is about, as the product can quote it: logo, symbol, price. */
const TokenChip = ({ cashtag }: { cashtag: string }) => {
  const resolved = useResolveCashtag(cashtag)
  const token = resolved.data
  // One quote per ticker, shared by every post that names it, and not polled:
  // the chip says roughly what the token costs, the market card says exactly.
  const quote = useQuote(token?.ticker, { active: false, enabled: Boolean(token) }).data
  const price = token?.token_price ?? quote?.token_price ?? quote?.divergence?.token_price
  if (!token) return null
  return (
    <span className="inline-flex h-6 items-center gap-1.5 self-start rounded-full bg-[#303030] pl-[3px] pr-2">
      <CardToken ticker={token.ticker} chain={token.chain} logo={token.logo} size={18} />
      <span className="text-11 font-semibold">{token.symbol}</span>
      {price && <span className="text-11 tabular-nums text-[#c4c4c4]">{usd(price)}</span>}
    </span>
  )
}

const EvidencePostRow = ({
  post,
  annotation,
  index,
}: {
  post: ResearchPostSnapshot
  annotation?: StanceAnnotation
  index: number
}) => {
  const cashtag = post.text.match(CASHTAG)?.[0]
  return (
    <div
      {...openOnXProps(post.url, `Post by ${post.author.name || post.author.handle}`)}
      style={{ animationDelay: `${0.15 + index * STAGGER_S}s` }}
      className={cn(
        'card-rise flex gap-2.5 border-t border-[#323232] px-3.5 py-3',
        OPENABLE_CLASS
      )}>
      <SafeAvatar
        url={post.author.avatarUrl}
        name={post.author.name || post.author.handle}
        size="default"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="text-12 flex items-center gap-[5px] whitespace-nowrap leading-4">
          <span className="min-w-0 truncate font-semibold text-[#ececec]">
            {post.author.name || post.author.handle}
          </span>
          {post.author.verified && (
            <VerifiedIcon className="size-[13px] shrink-0 text-[#1d9bf0]" aria-label="Verified" />
          )}
          <span className="min-w-0 truncate text-[#9a9a9a]">
            @{post.author.handle}
            {post.publishedAt && (
              <>
                {' · '}
                <PostTime iso={post.publishedAt} />
              </>
            )}
          </span>
          {annotation && (
            <span
              title={`Subject: ${annotation.subject}`}
              className={cn(
                'ml-auto flex h-[18px] shrink-0 items-center rounded-full px-1.5 text-[10px] font-bold',
                STANCE_STYLE[annotation.stance]
              )}>
              {STANCE_LABEL[annotation.stance]}
            </span>
          )}
        </div>
        <PostText text={post.text} />
        {cashtag && <TokenChip cashtag={cashtag} />}
      </div>
    </div>
  )
}

export const PostEvidenceList = ({
  posts,
  annotations = [],
  initial = DEFAULT_VISIBLE,
}: {
  posts: readonly ResearchPostSnapshot[]
  annotations?: readonly StanceAnnotation[]
  /** Rows shown before the reader asks. Zero folds the list behind its button. */
  initial?: number
}) => {
  const [expanded, setExpanded] = useState(false)
  const stanceByPost = new Map(annotations.map((annotation) => [annotation.postId, annotation]))
  const shown = expanded ? posts : posts.slice(0, initial)
  const hidden = posts.length - initial
  const more =
    initial === 0
      ? `Show the ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`
      : `Show ${hidden} more ${hidden === 1 ? 'post' : 'posts'}`

  if (posts.length === 0) return null

  return (
    <div className="flex flex-col">
      {shown.map((post, index) => (
        <EvidencePostRow
          key={post.id}
          post={post}
          annotation={stanceByPost.get(post.id)}
          index={index}
        />
      ))}

      {hidden > 0 && (
        <div className="border-t border-[#323232] px-3.5 pb-3.5 pt-2.5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-12 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-[#3d3d3d] bg-transparent font-semibold text-[#ececec] transition-colors hover:bg-white/[0.04]">
            {expanded ? 'Show fewer posts' : more}
            <ChevronDown
              aria-hidden
              className={cn(
                'size-3.5 text-[#c4c4c4] transition-transform',
                expanded && 'rotate-180'
              )}
              strokeWidth={1.75}
            />
          </button>
        </div>
      )}
    </div>
  )
}

import type { CheckedSource, ClaimCheckCard } from '@extension/shared'
import { isSafeHttpUrl } from '@extension/shared'
import { cn } from '@extension/ui'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Info,
  Minus,
  X,
} from 'lucide-react'
import { useState } from 'react'

import { Chip, Inset, SectionLabel, day, type Tone } from './card-kit'

/**
 * Whether a claim is corroborated, and by what.
 *
 * The claim is quoted, the documents that were read are drawn under a lens,
 * each with its own finding, and the three counts sit under them. The verdict
 * is the header's chip and one sentence in a box, because it is the whole
 * answer.
 *
 * `unverified` is the common case and it is not a negative finding: a filing
 * that does not mention something is not a filing that denies it. It is amber,
 * not red, and its sentence says so.
 *
 * Posts do not count toward the verdict. They are usually where the reader saw
 * the claim, so they are kept, folded under a count.
 */

const VERDICT: Record<
  ClaimCheckCard['verdict'],
  { label: string; tone: Tone; icon: typeof Check; box: string; ink: string }
> = {
  corroborated: {
    label: 'Corroborated',
    tone: 'green',
    icon: Check,
    box: 'border-[rgba(94,237,135,0.22)] bg-[rgba(94,237,135,0.06)]',
    ink: 'text-[#5eed87]',
  },
  contradicted: {
    label: 'Contradicted',
    tone: 'coral',
    icon: X,
    box: 'border-[rgba(255,138,122,0.22)] bg-[rgba(255,138,122,0.06)]',
    ink: 'text-[#ff8a7a]',
  },
  mixed: {
    label: 'Sources disagree',
    tone: 'amber',
    icon: AlertTriangle,
    box: 'border-[rgba(255,176,0,0.22)] bg-[rgba(255,176,0,0.06)]',
    ink: 'text-[#ffb000]',
  },
  unverified: {
    label: 'Unverified',
    tone: 'amber',
    icon: Minus,
    box: 'border-[rgba(255,176,0,0.22)] bg-[rgba(255,176,0,0.06)]',
    ink: 'text-[#ffb000]',
  },
}

const SOURCE: Record<
  CheckedSource['verdict'],
  { label: string; icon: typeof Check; ring: string }
> = {
  supports: {
    label: 'Supports',
    icon: Check,
    ring: 'text-[#5eed87] shadow-[inset_0_0_0_1.5px_#5eed87]',
  },
  contradicts: {
    label: 'Contradicts',
    icon: X,
    ring: 'text-[#ff8a7a] shadow-[inset_0_0_0_1.5px_#ff8a7a]',
  },
  unaddressed: {
    label: 'No mention',
    icon: Minus,
    ring: 'text-[#9a9a9a] shadow-[inset_0_0_0_1.5px_#9a9a9a]',
  },
  unread: {
    label: 'Unread',
    icon: Minus,
    ring: 'text-[#9a9a9a] shadow-[inset_0_0_0_1.5px_#9a9a9a]',
  },
}

export const VerdictChip = ({ card }: { card: ClaimCheckCard }) => {
  const verdict = VERDICT[card.verdict] ?? VERDICT.unverified
  const Icon = verdict.icon
  return (
    <Chip tone={verdict.tone} icon={<Icon aria-hidden className="size-[11px]" strokeWidth={3} />}>
      {verdict.label}
    </Chip>
  )
}

/** A form code a reader recognises, without the dash: `10-Q` → `10Q`, a release → `PR`. */
const docLabel = (source: CheckedSource): string => {
  if (source.kind === 'company_announcement') return 'PR'
  const form = /\b(10-?K|10-?Q|8-?K|20-?F|6-?K|S-?1|DEF ?14A)\b/i.exec(source.title)?.[1]
  return form ? form.replace('-', '').toUpperCase() : 'SEC'
}

const Documents = ({ sources }: { sources: readonly CheckedSource[] }) => (
  <Inset className="relative flex h-[108px] items-center justify-center gap-3 overflow-hidden">
    {sources.slice(0, 4).map((source, index) => {
      const mark = SOURCE[source.verdict] ?? SOURCE.unread
      const Icon = mark.icon
      return (
        <div
          key={`${source.title}-${index}`}
          aria-hidden
          className="card-rise relative box-border flex h-[66px] w-[52px] flex-col gap-[5px] rounded-[7px] bg-[#303030] px-[7px] py-2 shadow-[inset_0_0_0_1px_#3d3d3d]"
          style={{ animationDelay: `${0.15 + index * 0.1}s` }}>
          <span className="text-[8px] font-bold text-[#c4c4c4]">{docLabel(source)}</span>
          {[34, 28, 36, 22].map((width) => (
            <span key={width} className="h-0.5 rounded-sm bg-[#4a4a4a]" style={{ width }} />
          ))}
          <span
            className={cn(
              'absolute -bottom-[5px] -right-[5px] flex size-4 items-center justify-center rounded-full bg-[#282828]',
              mark.ring
            )}>
            <Icon className="size-[9px]" strokeWidth={3} />
          </span>
        </div>
      )
    })}
    <span
      aria-hidden
      className="card-scan absolute top-[22px] flex"
      style={{
        left: `calc(50% - ${Math.min(sources.length, 4) * 32}px)`,
        ['--scan' as string]: `${Math.max(Math.min(sources.length, 4) - 1, 1) * 64}px`,
      }}>
      <svg width="46" height="46" viewBox="0 0 46 46">
        <circle
          cx="19"
          cy="19"
          r="14"
          fill="rgba(255,255,255,0.05)"
          stroke="#ececec"
          strokeWidth="2.5"
        />
        <path d="M29.5 29.5 42 42" stroke="#ececec" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </span>
  </Inset>
)

const Count = ({ value, label, muted }: { value: number; label: string; muted?: boolean }) => (
  <Inset className="flex flex-col gap-0.5 rounded-[10px] p-2.5">
    <span className={cn('text-lg font-semibold tabular-nums', muted && 'text-[#c4c4c4]')}>
      {value}
    </span>
    <span className="text-11 text-[#9a9a9a]">{label}</span>
  </Inset>
)

const explanation = (card: ClaimCheckCard) => {
  const checked = card.primaryChecked
  const sources = (n: number) => `${n} primary ${n === 1 ? 'source' : 'sources'}`
  switch (card.verdict) {
    case 'corroborated':
      return (
        <>
          <b className="font-bold text-[#ececec]">
            {sources(card.primarySupporting)} of {checked} state this.
          </b>{' '}
          Read them before relying on it.
        </>
      )
    case 'contradicted':
      return (
        <>
          <b className="font-bold text-[#ececec]">
            {sources(card.primaryContradicting)} of {checked} say otherwise.
          </b>{' '}
          The claim does not match the company&apos;s own record.
        </>
      )
    case 'mixed':
      return (
        <>
          <b className="font-bold text-[#ececec]">The sources disagree.</b> {card.primarySupporting}{' '}
          support it and {card.primaryContradicting} contradict it.
        </>
      )
    default:
      return checked > 0 ? (
        <>
          No filing or announcement addresses it.{' '}
          <b className="font-bold text-[#ececec]">Unverified is not false.</b> It means nothing
          primary has said so yet.
        </>
      ) : (
        <>
          No filing or announcement was available to check.{' '}
          <b className="font-bold text-[#ececec]">Unverified is not false.</b>
        </>
      )
  }
}

/** "Filed Aug 27, 2026" for a filing; the publisher and the date for anything else. */
const sourceLine = (source: CheckedSource): string => {
  const when = day(source.publishedAt)
  if (source.kind === 'sec_filing') return when ? `Filed ${when}` : source.publisher
  return when ? `${source.publisher}, ${when}` : source.publisher
}

const SourceRow = ({ source }: { source: CheckedSource }) => {
  const mark = SOURCE[source.verdict] ?? SOURCE.unread
  const safe = isSafeHttpUrl(source.url) ? source.url : undefined
  const body = (
    <>
      <FileText aria-hidden className="size-3.5 shrink-0 text-[#9a9a9a]" strokeWidth={1.75} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-12 truncate font-medium text-[#ececec]">{source.title}</span>
        <span className="text-11 truncate text-[#9a9a9a]">{sourceLine(source)}</span>
      </span>
      <span
        className={cn(
          'text-11 shrink-0',
          source.verdict === 'supports'
            ? 'text-[#5eed87]'
            : source.verdict === 'contradicts'
              ? 'text-[#ff8a7a]'
              : 'text-[#9a9a9a]'
        )}>
        {mark.label}
      </span>
      {safe && (
        <ExternalLink aria-hidden className="size-3 shrink-0 text-[#9a9a9a]" strokeWidth={1.75} />
      )}
    </>
  )
  const className = 'flex items-center gap-2.5 border-t border-[#323232] py-2'
  return safe ? (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(className, 'text-inherit no-underline hover:bg-white/[0.02]')}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  )
}

export const ClaimCheckBody = ({ card }: { card: ClaimCheckCard }) => {
  const verdict = VERDICT[card.verdict] ?? VERDICT.unverified
  const primary = card.sources.filter((source) => source.kind !== 'x_post')
  const posts = card.sources.filter((source) => source.kind === 'x_post')
  const [postsOpen, setPostsOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 p-3.5">
      <blockquote className="m-0 flex gap-2.5 rounded-xl border border-[#323232] bg-white/[0.03] p-3">
        <span aria-hidden className="font-serif text-[28px] leading-5 text-[#555555]">
          “
        </span>
        <span className="text-sm font-medium leading-5 text-[#ececec]">{card.claim}</span>
      </blockquote>

      {primary.length > 0 && <Documents sources={primary} />}

      <div className="grid grid-cols-3 gap-2">
        <Count value={card.primaryChecked} label="primary sources read" />
        <Count value={card.primarySupporting} label="support it" muted={!card.primarySupporting} />
        <Count
          value={card.primaryContradicting}
          label="contradict it"
          muted={!card.primaryContradicting}
        />
      </div>

      <div className={cn('flex items-start gap-2 rounded-[10px] border px-3 py-2.5', verdict.box)}>
        <Info
          aria-hidden
          className={cn('mt-px size-3.5 shrink-0', verdict.ink)}
          strokeWidth={1.9}
        />
        <span className="text-12 leading-[17px] text-[#c4c4c4]">{explanation(card)}</span>
      </div>

      {primary.length > 0 && (
        <div className="flex flex-col">
          <SectionLabel>Checked against</SectionLabel>
          <div className="h-1.5" />
          {primary.map((source, index) => (
            <SourceRow key={`${source.kind}-${source.title}-${index}`} source={source} />
          ))}
        </div>
      )}

      {posts.length > 0 && (
        <div className="flex flex-col">
          <button
            type="button"
            aria-expanded={postsOpen}
            onClick={() => setPostsOpen((value) => !value)}
            className="text-12 flex h-8 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[#9a9a9a] transition-colors hover:text-[#ececec]">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'} repeated this claim
            <ChevronDown className={cn('size-3 transition-transform', postsOpen && 'rotate-180')} />
          </button>
          {postsOpen &&
            posts.map((source, index) => (
              <SourceRow key={`post-${source.title}-${index}`} source={source} />
            ))}
        </div>
      )}
    </div>
  )
}

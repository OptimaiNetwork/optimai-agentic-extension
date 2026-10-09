import type { TermKind } from '../services/types'
import type { TermMatch } from './matcher'

/**
 * The element a badge lives in. A custom element with its own shadow root, so
 * no page rule reaches the pill inside it and it adds no text to the page.
 */
export const BADGE_TAG = 'catalyst-badge'

/**
 * What a mention names: the company (its name or a curated alias), its ticker,
 * or one token's symbol. A page gets one badge per kind of mention of each
 * company, and one per symbol — `NVDAon` and `NVDAB` are two tokens.
 */
export type BadgeKind = 'company' | 'ticker' | 'symbol'

export const badgeKindOf = (kind: TermKind): BadgeKind =>
  kind === 'name' || kind === 'alias' ? 'company' : kind

export const isBadgeKind = (value: unknown): value is BadgeKind =>
  value === 'company' || value === 'ticker' || value === 'symbol'

/** One badge per key per page: `company:NVDA`, `ticker:NVDA`, `symbol:NVDAON`. */
export const badgeKey = (match: TermMatch): string => {
  const kind = badgeKindOf(match.term.kind)
  return kind === 'symbol'
    ? `symbol:${match.term.term.replace(/^\$/, '').toUpperCase()}`
    : `${kind}:${match.ticker}`
}

/**
 * A link no longer than this is a link on the word itself (Wikipedia's
 * "Nvidia"), and the badge goes after it. A longer one is a whole headline or
 * card made clickable, and the badge stays beside the word inside it.
 */
const WORD_LINK_MAX_LENGTH = 64

const wordLinkAround = (node: Text): HTMLAnchorElement | null => {
  const link = node.parentElement?.closest('a')
  if (!link) return null
  return (link.textContent ?? '').trim().length <= WORD_LINK_MAX_LENGTH ? link : null
}

const createBadge = (document: Document, match: TermMatch): HTMLElement => {
  const badge = document.createElement(BADGE_TAG)
  badge.dataset.key = badgeKey(match)
  badge.dataset.kind = badgeKindOf(match.term.kind)
  badge.dataset.ticker = match.ticker
  badge.dataset.term = match.term.term
  return badge
}

export interface InsertedBadges {
  /** In document order. */
  badges: HTMLElement[]
  /** Text the split left behind, already examined with the node it came from. */
  pieces: Text[]
}

/**
 * Puts a badge right after each match, in place, without touching the words.
 *
 * The node is cut after the matched word and the badge goes between the halves,
 * so the page keeps its own node for everything before it. Right to left, so
 * every cut leaves the offsets of the earlier matches valid. A word that is a
 * link gets its badge after the link, where clicking it cannot follow the link.
 */
export const insertBadges = (node: Text, matches: readonly TermMatch[]): InsertedBadges => {
  if (!matches.length || !node.parentNode) return { badges: [], pieces: [] }
  const document = node.ownerDocument
  const length = node.data.length
  const ordered = [...matches]
    .filter((match) => match.start >= 0 && match.end <= length && match.start < match.end)
    .sort((a, b) => a.start - b.start)
  const link = wordLinkAround(node)

  const badges: HTMLElement[] = []
  const pieces: Text[] = []
  for (const match of ordered.reverse()) {
    const badge = createBadge(document, match)
    if (link) {
      link.after(badge)
    } else if (match.end < node.data.length) {
      const rest = node.splitText(match.end)
      rest.before(badge)
      pieces.push(rest)
    } else {
      node.after(badge)
    }
    badges.unshift(badge)
  }
  return { badges, pieces }
}

import { BADGE_TAG, badgeKey, insertBadges } from './badge'
import { collectTextNodes, isInsideSkipped } from './dom'
import { findMatches, type Matcher, type TermMatch } from './matcher'

export interface ScanLimits {
  /** Text nodes examined per page. A page past this is an app, not an article. */
  maxTextNodes: number
  /** Badges per page. Past this the page is a table of tickers and is badged enough. */
  maxBadges: number
  /** Text nodes per idle slice, so a long page never holds the main thread. */
  batchSize: number
  /** How long DOM changes settle before new content is scanned. */
  debounceMs: number
}

export const DEFAULT_LIMITS: ScanLimits = {
  maxTextNodes: 20_000,
  maxBadges: 200,
  batchSize: 200,
  debounceMs: 300,
}

export interface ScanStats {
  textNodes: number
  badges: number
  /** Main-thread time spent matching and inserting, summed over every slice. */
  scanMs: number
  tickers: number
  done: boolean
}

type Schedule = (work: () => void) => void

const IDLE_TIMEOUT_MS = 500

const defaultSchedule: Schedule = (work) => {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => work(), { timeout: IDLE_TIMEOUT_MS })
  } else {
    setTimeout(work, 0)
  }
}

interface ScannerOptions {
  root: Element
  matcher: Matcher
  limits?: Partial<ScanLimits>
  schedule?: Schedule
  onBadges?: (badges: HTMLElement[]) => void
  onStats?: (stats: ScanStats) => void
}

/** How many matches one text node is searched for; the rest of a node is repetition. */
const MATCHES_PER_NODE = 32

/**
 * Scans a page's text for lexicon terms, puts a badge after the first mention
 * of each kind, and keeps scanning what the page adds.
 *
 * One badge per key (`badge.ts`) for as long as that badge is on the page: a
 * page that says "Nvidia" three times and "NVDAon" twice gets two badges, both
 * at the first mention. When the page removes a badged mention — a single-page
 * app moving on to its next article — the key is free again.
 *
 * Work is cut into idle-time slices; the observer only ever queues the nodes
 * that changed, never the whole page again; and every node is examined once —
 * including the pieces left behind when a node is cut for a badge, which are
 * marked seen so our own edits do not come back as new content.
 */
export const createScanner = ({
  root,
  matcher,
  limits: overrides,
  schedule = defaultSchedule,
  onBadges,
  onStats,
}: ScannerOptions) => {
  const limits = { ...DEFAULT_LIMITS, ...overrides }
  const seen = new WeakSet<Text>()
  const tickers = new Set<string>()
  const badged = new Map<string, HTMLElement>()
  const queue: Text[] = []
  const pendingRoots = new Set<Node>()
  let textNodes = 0
  let badges = 0
  let scanMs = 0
  let draining = false
  let stopped = false
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  const exhausted = () => textNodes >= limits.maxTextNodes || badges >= limits.maxBadges

  const stats = (): ScanStats => ({
    textNodes,
    badges,
    scanMs: Math.round(scanMs * 10) / 10,
    tickers: tickers.size,
    done: !draining && queue.length === 0,
  })

  /** The matches in this node that are the first of their kind still on the page. */
  const firstMentions = (matches: readonly TermMatch[]): TermMatch[] => {
    const fresh = new Map<string, TermMatch>()
    for (const match of matches) {
      const key = badgeKey(match)
      if (fresh.has(key) || badged.get(key)?.isConnected) continue
      fresh.set(key, match)
    }
    return [...fresh.values()].slice(0, limits.maxBadges - badges)
  }

  const scanNode = (node: Text) => {
    if (seen.has(node) || !node.isConnected) return
    seen.add(node)
    textNodes += 1
    const matches = firstMentions(findMatches(node.data, matcher, MATCHES_PER_NODE))
    if (!matches.length) return
    const inserted = insertBadges(node, matches)
    for (const piece of inserted.pieces) seen.add(piece)
    for (const badge of inserted.badges) {
      badged.set(badge.dataset.key ?? '', badge)
      if (badge.dataset.ticker) tickers.add(badge.dataset.ticker)
    }
    badges += inserted.badges.length
    if (inserted.badges.length) onBadges?.(inserted.badges)
  }

  const drain = () => {
    if (stopped) return
    const started = performance.now()
    const batch = queue.splice(0, limits.batchSize)
    for (const node of batch) {
      if (exhausted()) break
      scanNode(node)
    }
    scanMs += performance.now() - started
    if (queue.length && !exhausted()) {
      schedule(drain)
    } else {
      queue.length = 0
      draining = false
    }
    onStats?.(stats())
  }

  const enqueue = (from: Node) => {
    if (stopped || exhausted()) return
    const room = limits.maxTextNodes - textNodes - queue.length
    if (room <= 0) return
    for (const node of collectTextNodes(from, room)) {
      if (!seen.has(node)) queue.push(node)
    }
    if (queue.length && !draining) {
      draining = true
      schedule(drain)
    }
  }

  const flush = () => {
    flushTimer = null
    const roots = Array.from(pendingRoots)
    pendingRoots.clear()
    for (const node of roots) {
      if (!node.isConnected || isInsideSkipped(node, root)) continue
      enqueue(node)
    }
  }

  const isOurs = (node: Node): boolean =>
    (node.nodeType === Node.TEXT_NODE && seen.has(node as Text)) ||
    (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === BADGE_TAG.toUpperCase())

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        const target = record.target as Text
        // An edited node is new text: scan it again.
        seen.delete(target)
        pendingRoots.add(target)
        continue
      }
      for (const added of Array.from(record.addedNodes)) {
        if (!isOurs(added)) pendingRoots.add(added)
      }
    }
    if (pendingRoots.size && !flushTimer) flushTimer = setTimeout(flush, limits.debounceMs)
  })

  return {
    start() {
      enqueue(root)
      observer.observe(root, { childList: true, subtree: true, characterData: true })
    },
    stop() {
      stopped = true
      observer.disconnect()
      if (flushTimer) clearTimeout(flushTimer)
      queue.length = 0
    },
    stats,
  }
}

export type Scanner = ReturnType<typeof createScanner>

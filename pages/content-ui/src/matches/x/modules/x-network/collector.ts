import { attribute, type CaptureEnvelope } from './evidence'
import { parseTimeline } from './parse-timeline'
import type { CatalystPost, ParseReason } from './types'

const EVENT = 'catalyst:x-response'
const READY = 'catalyst:x-ready'
const ACK = 'catalyst:x-ack'

/**
 * The ticker index ages out. A catalyst from three days ago is not what somebody
 * scrolling now is asking about. The *post* store keeps them: a research run may
 * legitimately ask for an older window, and deciding that here would silently
 * overrule the question.
 */
const MAX_AGE_MS = 48 * 60 * 60 * 1000
const MAX_POSTS_PER_TICKER = 200
const MAX_POSTS_TOTAL = 800

export interface PostObservation {
  firstSeenAt: number
  lastSeenAt: number
  /** How many responses carried this post. Re-observation is not a new find. */
  times: number
}

export interface TransportError {
  status: number
  at: number
}

interface Store {
  byTicker: Map<string, Map<string, CatalystPost>>
  all: Map<string, CatalystPost>
  observations: Map<string, PostObservation>
  drift: { reason: ParseReason; at: number } | null
  lastTransportError: TransportError | null
  /**
   * Symbol to ticker, supplied once the catalog has loaded.
   *
   * Without it a post saying `$NVDAB` filed itself under NVDAB while the panel,
   * having resolved the cashtag properly, asked for NVDA — and told the user
   * nothing had been read about a post captured seconds earlier.
   */
  aliases: Map<string, string>
}

const store: Store = {
  byTicker: new Map(),
  all: new Map(),
  observations: new Map(),
  drift: null,
  lastTransportError: null,
  aliases: new Map(),
}
const listeners = new Set<() => void>()

/**
 * The last capture this collector has taken delivery of.
 *
 * Sent back to the MAIN-world hook when we (re)announce ourselves, so a replay
 * resumes from the gap rather than from the beginning. A boolean "listening"
 * flag cannot express that: it says somebody was there, not what they got.
 */
let ackSequence = 0

const notify = () => listeners.forEach((listener) => listener())

const tickersOf = (post: CatalystPost): string[] => {
  // Three steps, and all three are load-bearing. X resolves the cashtag itself,
  // so `symbol.ticker` is usually right. Our own alias map then maps an issuer's
  // symbol onto the ticker we can price. The raw text is the last resort, for a
  // cashtag neither of them recognised.
  const names = post.symbols.map((symbol) => {
    const raw = (symbol.ticker ?? symbol.text).toUpperCase()
    return store.aliases.get(raw) ?? raw
  })
  return [...new Set(names)]
}

/**
 * Teach the collector which symbols mean which ticker.
 *
 * Re-files anything already collected: posts arrive from the moment the panel
 * mounts, and the catalog lands a fetch later, so the first few are always
 * captured before this is known.
 */
export const setAliases = (aliases: Map<string, string>): void => {
  if (aliases.size === 0) return
  store.aliases = aliases

  const posts = [...store.all.values()]
  store.byTicker = new Map()
  let changed = false
  for (const post of posts) {
    if (indexPost(post)) changed = true
  }
  if (changed) notify()
}

const isFresh = (post: CatalystPost, now: number): boolean => {
  if (!post.createdAt) return true
  return now - new Date(post.createdAt).getTime() < MAX_AGE_MS
}

const indexPost = (post: CatalystPost): boolean => {
  const now = Date.now()
  if (!isFresh(post, now)) return false

  let changed = false
  for (const ticker of tickersOf(post)) {
    let bucket = store.byTicker.get(ticker)
    if (!bucket) {
      bucket = new Map()
      store.byTicker.set(ticker, bucket)
    }
    if (bucket.has(post.id)) continue

    bucket.set(post.id, post)
    changed = true

    if (bucket.size > MAX_POSTS_PER_TICKER) {
      // Oldest first. Map preserves insertion order, and insertion order here is
      // the order X served them, which is close enough to recency.
      const oldest = bucket.keys().next().value
      if (oldest) bucket.delete(oldest)
    }
  }
  return changed
}

/**
 * Store the post, and record that it was seen again.
 *
 * The two are separate on purpose. Deduplicating before recording the sighting
 * loses the only signal that distinguishes "X keeps returning the same page" from
 * "X has stopped returning anything".
 */
const remember = (post: CatalystPost, observedAt: number): boolean => {
  const seen = store.observations.get(post.id)
  if (seen) {
    seen.lastSeenAt = observedAt
    seen.times += 1
  } else {
    store.observations.set(post.id, { firstSeenAt: observedAt, lastSeenAt: observedAt, times: 1 })
  }

  const isNew = !store.all.has(post.id)
  if (isNew) {
    store.all.set(post.id, post)
    while (store.all.size > MAX_POSTS_TOTAL) {
      const oldest = store.all.keys().next().value
      if (!oldest) break
      store.all.delete(oldest)
      store.observations.delete(oldest)
    }
  }

  return indexPost(post) || isNew
}

interface RawCapture extends Partial<CaptureEnvelope> {
  body?: string
  status?: number
  capturedAt?: number
}

const envelopeOf = (raw: RawCapture): CaptureEnvelope => ({
  captureId: raw.captureId ?? `cap_${raw.sequence ?? 0}`,
  sequence: raw.sequence ?? 0,
  operation: raw.operation ?? 'unknown',
  url: raw.url ?? '',
  status: raw.status ?? 0,
  requestedAt: raw.requestedAt ?? raw.capturedAt ?? Date.now(),
  capturedAt: raw.capturedAt ?? Date.now(),
  query: raw.query,
  product: raw.product,
  cursor: raw.cursor,
})

const acknowledge = (sequence: number): void => {
  if (sequence > 0) {
    document.dispatchEvent(new CustomEvent(ACK, { detail: { sequence } }))
  }
}

const handle = (event: Event): void => {
  const detail = (event as CustomEvent<string>).detail
  if (typeof detail !== 'string') return

  let raw: RawCapture
  try {
    raw = JSON.parse(detail) as RawCapture
  } catch {
    return
  }

  const envelope = envelopeOf(raw)
  if (envelope.sequence > ackSequence) ackSequence = envelope.sequence

  try {
    if (envelope.status >= 400) {
      // A 429 or a login wall is not a schema change. Parsing its body would fail
      // and be recorded as drift, and the panel would then tell every later reader
      // that X had changed its responses. It is still worth knowing about: a run
      // that collected nothing behind a 401 must not report a quiet day.
      store.lastTransportError = { status: envelope.status, at: envelope.capturedAt }
      notify()
      return
    }

    let body: unknown
    try {
      if (typeof raw.body !== 'string') return
      body = JSON.parse(raw.body)
    } catch {
      return
    }

    const result = parseTimeline(body)

    if (result.outcome === 'drift') {
      // Recorded rather than swallowed. If X moves its schema, the panel should be
      // able to say "we stopped being able to read this" instead of showing an
      // empty list that looks like a quiet day.
      store.drift = { reason: result.reason, at: Date.now() }
    } else {
      // Cleared on the next good read. Leaving it set meant one malformed response
      // made every empty panel for the rest of the tab's life claim X had changed
      // its schema.
      store.drift = null
      store.lastTransportError = null
    }

    const posts = result.posts.map((post) => ({ ...post, capturedAt: envelope.capturedAt }))
    let changed = false
    for (const post of posts) {
      if (remember(post, envelope.capturedAt)) changed = true
    }

    // Attribution is separate from storage: a post belongs to the run that asked
    // for it, and the passive store keeps everything else the page happened to load.
    const attributed = attribute(
      envelope,
      posts,
      result.coverage,
      result.outcome === 'drift' ? result.reason : null
    )

    if (changed || attributed || result.outcome === 'drift') notify()
  } finally {
    // The MAIN-world buffer is bounded, but acknowledging every observed capture
    // prevents already-processed responses from being replayed on reconnect.
    acknowledge(envelope.sequence)
  }
}

let started = false

/** Announce this collector to the page hook, asking for anything it missed. */
const announce = (): void => {
  document.dispatchEvent(new CustomEvent(READY, { detail: { ackSequence } }))
}

/** Starts listening. Safe to call more than once. */
export const startCollecting = (): (() => void) => {
  if (started) return () => undefined
  started = true
  document.addEventListener(EVENT, handle)
  // Tells the MAIN-world hook somebody is listening, so it replays whatever it
  // captured before this tree existed. The first timeline X fetches lands before
  // React has mounted anything.
  announce()
  return () => {
    document.removeEventListener(EVENT, handle)
    started = false
  }
}

/**
 * Ask for a replay from the last acknowledged capture.
 *
 * Called before a run navigates: establishing readiness *before* the request is
 * the difference between collecting a response and waiting forever for one that
 * already arrived.
 */
export const requestReplay = (): void => {
  if (!started) {
    startCollecting()
    return
  }
  announce()
}

const postsForInternal = (ticker: string, capturedAfter?: number): CatalystPost[] => {
  const needle = ticker.toUpperCase()
  const bucket = store.byTicker.get(needle)
  const matches = new Map<string, CatalystPost>()
  for (const [id, post] of bucket ?? []) {
    if (capturedAfter === undefined || (post.capturedAt ?? 0) >= capturedAfter) {
      matches.set(id, post)
    }
  }

  // Search results sometimes contain prose about a ticker without a cashtag.
  // Keep those posts in the bounded all-post store and include an exact ticker
  // mention as a candidate. The research layer still decides relevance before
  // sending evidence to the model.
  //
  // The age filter is repeated here on purpose. The post store itself no longer
  // ages anything out — a research run may legitimately ask for an older window
  // — so this view has to apply its own cutoff or the mention fallback would
  // quietly hand the search card three-day-old posts it is documented not to
  // show.
  const now = Date.now()
  const mention = new RegExp(
    `(?:\\$)?\\b${needle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`,
    'i'
  )
  for (const post of store.all.values()) {
    if (
      (capturedAfter === undefined || (post.capturedAt ?? 0) >= capturedAfter) &&
      isFresh(post, now) &&
      mention.test(post.text)
    ) {
      matches.set(post.id, post)
    }
  }

  return [...matches.values()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

export const postsFor = (ticker: string): CatalystPost[] => postsForInternal(ticker)

/** Posts received after a research run started; tweet time is not used here. */
export const postsForSince = (ticker: string, capturedAfter: number): CatalystPost[] =>
  postsForInternal(ticker, capturedAfter)

export const driftSeen = (): ParseReason | null => store.drift?.reason ?? null

/** The last 4xx/5xx X answered a timeline request with, if it was recent. */
export const transportErrorSeen = (): TransportError | null => store.lastTransportError

export const observationOf = (postId: string): PostObservation | undefined =>
  store.observations.get(postId)

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test seam. Nothing in the extension calls this. */
export const __reset = (): void => {
  store.byTicker.clear()
  store.all.clear()
  store.observations.clear()
  store.aliases.clear()
  store.drift = null
  store.lastTransportError = null
  listeners.clear()
  started = false
  ackSequence = 0
}

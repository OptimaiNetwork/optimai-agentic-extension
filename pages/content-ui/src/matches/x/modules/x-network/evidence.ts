import type { BatchProvenance, ResearchPost } from '@x/services/agent'
import type { CatalystPost, ParseCoverage } from './types'

/**
 * Posts, grouped by the search that found them.
 *
 * The old collector filed a post under the ticker of its cashtag, which meant a
 * post saying only "Nvidia" belonged nowhere and a post about a different
 * quarter's earnings was indistinguishable from this morning's. A research run
 * needs the other shape: these posts, from this query, observed at this time,
 * with the responses they came out of still attached.
 *
 * One post can belong to several executions and be seen many times. Seeing it
 * again is an observation, not a new post — counting re-observations as finds is
 * how a run that is going nowhere looks like progress.
 */

export type SearchMode = 'latest' | 'top'

export interface QueryExecution {
  id: string
  query: string
  mode: SearchMode
  startedAt: number
  finishedAt?: number
  /** Deduplicated by post ID, in arrival order. */
  posts: Map<string, ResearchPost>
  batches: BatchProvenance[]
  coverage: { entries: number; tweetEntries: number; unsupportedEntries: number }
  driftReason: string | null
  warnings: string[]
  /** When the last matching network response arrived, for no-progress checks. */
  lastBatchAt: number | null
  /** The pagination cursor of the last batch, when X sent one. */
  cursor: string | null
}

export interface CaptureEnvelope {
  captureId: string
  sequence: number
  operation: string
  url: string
  status: number
  requestedAt: number
  capturedAt: number
  query?: string
  product?: string
  cursor?: string
}

const MAX_FINISHED = 12

const executions = new Map<string, QueryExecution>()
const finished: QueryExecution[] = []
let active: QueryExecution | null = null

/** Whitespace only. Case, quotes and operators all change what X returns. */
export const normalizeQuery = (query: string): string => query.trim().replace(/\s+/g, ' ')

const modeOf = (product: string | undefined): SearchMode | null => {
  if (!product) return null
  const value = product.toLowerCase()
  if (value === 'latest') return 'latest'
  if (value === 'top') return 'top'
  return null
}

export const beginExecution = (query: string, mode: SearchMode): QueryExecution => {
  const execution: QueryExecution = {
    id: `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    query: normalizeQuery(query),
    mode,
    startedAt: Date.now(),
    posts: new Map(),
    batches: [],
    coverage: { entries: 0, tweetEntries: 0, unsupportedEntries: 0 },
    driftReason: null,
    warnings: [],
    lastBatchAt: null,
    cursor: null,
  }
  executions.set(execution.id, execution)
  active = execution
  return execution
}

export const endExecution = (id: string): QueryExecution | undefined => {
  const execution = executions.get(id)
  if (!execution) return undefined
  execution.finishedAt = Date.now()
  if (active?.id === id) active = null
  finished.unshift(execution)
  while (finished.length > MAX_FINISHED) {
    const dropped = finished.pop()
    if (dropped) executions.delete(dropped.id)
  }
  return execution
}

export const getExecution = (id: string): QueryExecution | undefined => executions.get(id)

export const activeExecution = (): QueryExecution | null => active

/**
 * The most recent completed run of the same search, for cache reuse.
 *
 * Same query *and* same mode. A Top result set is not a Latest result set, and
 * treating one as the other is how "nothing new" gets reported from a tab that
 * was never showing new things.
 */
export const lastCompletedFor = (query: string, mode: SearchMode): QueryExecution | undefined => {
  const needle = normalizeQuery(query)
  return finished.find(
    (execution) => execution.query === needle && execution.mode === mode && execution.finishedAt
  )
}

export const toResearchPost = (post: CatalystPost, observedAt: number): ResearchPost => ({
  id: post.id,
  url: post.url,
  text: post.text.slice(0, 4000),
  published_at: post.createdAt ?? null,
  observed_at: new Date(observedAt).toISOString(),
  author: {
    handle: post.author.handle,
    name: post.author.name,
    followers: post.author.followers ?? null,
    verified: post.author.verified,
    avatar_url: post.author.avatarUrl ?? null,
  },
  tickers: post.symbols.map((symbol) => (symbol.ticker ?? symbol.text).toUpperCase()).slice(0, 12),
  reposted_post_id: post.repostedPostId ?? null,
  quoted_post_id: post.quotedPostId ?? null,
  truncated: post.text.length > 4000,
})

/**
 * Does this response belong to the run that is waiting for it?
 *
 * Three conditions, and dropping any one of them has been a real failure mode:
 * the same query on a different tab, a response to the *previous* identical
 * search that was still in flight when this one started, and a Top response
 * arriving while a Latest run is collecting. `requestedAt` is what makes the
 * middle one decidable, and it is only knowable at the request.
 */
export const belongsToActive = (envelope: CaptureEnvelope): boolean => {
  if (!active || active.finishedAt) return false
  if (envelope.operation !== 'SearchTimeline') return false
  if (envelope.requestedAt < active.startedAt) return false
  if (envelope.query === undefined) return false
  if (normalizeQuery(envelope.query) !== active.query) return false
  const mode = modeOf(envelope.product)
  return mode === null || mode === active.mode
}

export interface AttributionOutcome {
  /** Posts not already in this execution. Re-observations are not counted here. */
  added: number
  execution: QueryExecution
}

export const attribute = (
  envelope: CaptureEnvelope,
  posts: CatalystPost[],
  coverage: ParseCoverage,
  driftReason: string | null
): AttributionOutcome | null => {
  if (!belongsToActive(envelope) || !active) return null
  const execution = active

  let added = 0
  for (const post of posts) {
    if (!execution.posts.has(post.id)) {
      execution.posts.set(post.id, toResearchPost(post, envelope.capturedAt))
      added += 1
    }
  }

  execution.batches.push({
    capture_id: envelope.captureId,
    query: execution.query,
    mode: execution.mode,
    requested_at: new Date(envelope.requestedAt).toISOString(),
    received_at: new Date(envelope.capturedAt).toISOString(),
    http_status: envelope.status,
    posts: posts.length,
    // Provenance only. X's search cursors run to hundreds of characters and
    // the server keeps 200; a longer one once got the whole result refused.
    cursor: envelope.cursor?.slice(0, 200) ?? null,
  })
  execution.coverage.entries += coverage.entries
  execution.coverage.tweetEntries += coverage.tweetEntries
  execution.coverage.unsupportedEntries +=
    coverage.unsupportedTweetEntries + coverage.unsupportedInstructions
  execution.lastBatchAt = envelope.capturedAt
  execution.cursor = envelope.cursor ?? execution.cursor
  if (driftReason) {
    execution.driftReason = driftReason
    if (!execution.warnings.includes(driftReason)) execution.warnings.push(driftReason)
  }

  return { added, execution }
}

/** Test seam. Nothing in the extension calls this. */
export const __resetEvidence = (): void => {
  executions.clear()
  finished.length = 0
  active = null
}

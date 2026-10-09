import {
  beginExecution,
  endExecution,
  lastCompletedFor,
  normalizeQuery,
  requestReplay,
  transportErrorSeen,
  type QueryExecution,
  type SearchMode,
} from '@x/modules/x-network'
import { tweetIdOf } from '@x/modules/tweet-injection/cashtags'
import type { SearchXArgs, SearchXResult, SearchXStopReason } from '@x/services/agent'
import { useSyncExternalStore } from 'react'

/**
 * Running one `search_x` the model asked for.
 *
 * It drives X's own UI and reads X's own network responses. It never fetches
 * from X directly or scrapes the DOM for post text. The DOM is used only to
 * match parsed post IDs to visible articles for the reading animation. It never
 * builds a URL from anything the model wrote verbatim — the query is a
 * parameter, encoded here, on a path this file owns.
 *
 * The result is deliberately unflattering where it should be. "Collected six
 * posts" and "collected six posts and then X stopped answering" are different
 * answers, and only one of them means there is nothing more to find.
 */

const CACHE_MAX_AGE_MS = 3 * 60 * 1000
const FIRST_BATCH_TIMEOUT_MS = 9_000
const MAX_SCROLLS = 28
const MAX_RUN_MS = 40_000
const NO_PROGRESS_LIMIT = 4
// A scroll step of roughly one post's height, so each step brings one or two
// fresh posts into view, with a pause long enough for X to lay them out and
// for the network hook to see any batch the scroll triggered.
const SCROLL_MIN = 320
const SCROLL_RANGE = 200
const PAUSE_MIN_MS = 550
const PAUSE_RANGE_MS = 300
/** How long the reading sweep rests on one post. Matches the CSS sweep. */
const POST_READ_PAUSE_MS = 420
const TWEET_SELECTOR = 'article[data-testid="tweet"]'
const READING_CLASS = 'catalyst-agent-reading'

export type ResearchStatus =
  | 'idle'
  | 'preparing'
  | 'navigating'
  | 'collecting'
  | 'finalizing'
  | 'done'

export interface ResearchState {
  status: ResearchStatus
  executionId: string | null
  query: string | null
  mode: SearchMode | null
  /** Unique posts the network hook has parsed. */
  collected: number
  /** Posts the reading sweep has actually passed over on screen. */
  read: number
  target: number
  statusText: string
  stopReason: SearchXStopReason | null
}

const IDLE: ResearchState = {
  status: 'idle',
  executionId: null,
  query: null,
  mode: null,
  collected: 0,
  read: 0,
  target: 0,
  statusText: '',
  stopReason: null,
}

let state = IDLE
const listeners = new Set<() => void>()
let abort: AbortController | null = null

const notify = () => listeners.forEach((listener) => listener())

const set = (patch: Partial<ResearchState>) => {
  state = { ...state, ...patch }
  notify()
}

export const subscribeResearch = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getResearchSnapshot = (): ResearchState => state

export const useResearchState = (): ResearchState =>
  useSyncExternalStore(subscribeResearch, getResearchSnapshot, getResearchSnapshot)

export const isCollecting = (): boolean => state.status !== 'idle' && state.status !== 'done'

/** Stop whatever this tab is doing on X. Safe to call when nothing is running. */
export const abortActiveSearch = (reason = 'user_stopped'): void => {
  abort?.abort(reason)
}

const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })

/**
 * Find the next visible post that the network collector has actually parsed.
 * This reads only X's permalink ID from the DOM; all post content still comes
 * from the response parser.
 */
interface VisiblePost {
  id: string
  article: HTMLElement
}

const nextVisiblePost = (
  execution: QueryExecution,
  readPostIds: ReadonlySet<string>,
  target: number
): VisiblePost | null => {
  if (readPostIds.size >= target) return null

  const articles = Array.from(document.querySelectorAll<HTMLElement>(TWEET_SELECTOR))
  const viewportHeight = window.innerHeight
  for (const article of articles) {
    const id = tweetIdOf(article)
    if (!id || !execution.posts.has(id) || readPostIds.has(id)) continue
    const rect = article.getBoundingClientRect()
    if (rect.bottom <= 0 || rect.top >= viewportHeight) continue
    return { id, article }
  }
  return null
}

const readVisiblePosts = async (
  execution: QueryExecution,
  readPostIds: Set<string>,
  target: number,
  signal: AbortSignal,
  onReading: (read: number) => void,
  currentHighlight: { article: HTMLElement | null }
): Promise<boolean> => {
  while (!signal.aborted) {
    const post = nextVisiblePost(execution, readPostIds, target)
    if (!post) return true

    currentHighlight.article?.classList.remove(READING_CLASS)
    currentHighlight.article = post.article
    // Restarting the class restarts the sweep, so two posts read back to
    // back each get their own pass rather than the second inheriting a
    // finished one.
    void post.article.offsetWidth
    post.article.classList.add(READING_CLASS)
    readPostIds.add(post.id)
    onReading(readPostIds.size)
    await wait(POST_READ_PAUSE_MS, signal)
  }
  return false
}

const searchUrlFor = (query: string, mode: SearchMode): string => {
  const url = new URL('/search', window.location.origin)
  // Encoded by URLSearchParams, not concatenated. The query is model-chosen
  // text; it is data in a parameter, never a fragment of a path.
  url.searchParams.set('q', query)
  if (mode === 'latest') url.searchParams.set('f', 'live')
  url.searchParams.set('src', 'typed_query')
  return url.toString()
}

interface VisibleSearch {
  query: string
  mode: SearchMode
}

const visibleSearch = (): VisibleSearch | null => {
  if (window.location.pathname !== '/search') return null
  const params = new URLSearchParams(window.location.search)
  const query = params.get('q')
  if (!query) return null
  return { query: normalizeQuery(query), mode: params.get('f') === 'live' ? 'latest' : 'top' }
}

/** Where the page is parked between two searches for the same query. */
const BOUNCE_PATH = '/explore'
const BOUNCE_SETTLE_MS = 350

const pushRoute = (url: string): void => {
  window.history.pushState({}, '', url)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/**
 * Take X to the search, and make it a *new* search.
 *
 * Pushing the same URL the page already shows does nothing: X's router sees
 * no change and issues no request, and the run then waits on a batch that is
 * never coming. The previous fix typed the query back into the search box
 * and dispatched a synthetic Enter, which X's controlled input answers with
 * its suggestions dropdown and nothing else — the screenshot that reported
 * this bug shows exactly that dropdown open over a failed run.
 *
 * So a repeat search bounces: off to a neutral route, a beat for the router
 * to settle, then on to the search URL. Every arrival is a fresh mount and a
 * real request, which is what the network hook is waiting for.
 */
const navigate = async (query: string, mode: SearchMode, signal: AbortSignal): Promise<boolean> => {
  const target = searchUrlFor(query, mode)
  const current = visibleSearch()

  try {
    if (current && current.query === normalizeQuery(query) && current.mode === mode) {
      // A focused search box keeps its dropdown over the results; let it go
      // before the route changes under it.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      pushRoute(BOUNCE_PATH)
      await wait(BOUNCE_SETTLE_MS, signal)
      if (signal.aborted) return false
    }
    pushRoute(target)
    return true
  } catch {
    return false
  }
}

const transportStop = (since: number): SearchXStopReason | null => {
  const error = transportErrorSeen()
  if (!error || error.at < since) return null
  if (error.status === 401 || error.status === 403) return 'login_required'
  if (error.status === 429) return 'rate_limited'
  return null
}

const withinWindow = (published: string | null | undefined, args: SearchXArgs): boolean => {
  // Unknown publication time is kept, not guessed at. Dropping it would quietly
  // discard exactly the posts X renders without a timestamp.
  if (!published) return true
  const at = new Date(published).getTime()
  if (Number.isNaN(at)) return true
  if (args.published_after && at < new Date(args.published_after).getTime()) return false
  if (args.published_before && at >= new Date(args.published_before).getTime()) return false
  return true
}

/**
 * Whether the run worked, half-worked, or did not.
 *
 * An empty result behind a login wall is an error; an empty result at the end of
 * a timeline is a fine answer that happens to be "nothing". Collapsing the two
 * is how a run that never read anything gets reported as quiet news.
 */
const FAILURE_STOPS: readonly SearchXStopReason[] = [
  'login_required',
  'rate_limited',
  'navigation_failed',
  'refresh_not_observed',
  'parser_drift',
  'interrupted',
]

const statusFor = (
  stopReason: SearchXStopReason,
  posts: number,
  hasWarnings: boolean
): SearchXResult['status'] => {
  if (FAILURE_STOPS.includes(stopReason)) return posts > 0 ? 'partial' : 'error'
  return hasWarnings ? 'partial' : 'ok'
}

const resultFrom = (
  execution: QueryExecution,
  args: SearchXArgs,
  stopReason: SearchXStopReason,
  startedAt: number,
  extra: { cacheAgeSeconds?: number; warnings?: string[] } = {}
): SearchXResult => {
  const all = [...execution.posts.values()]
  const kept = all.filter((post) => withinWindow(post.published_at, args)).slice(0, args.max_posts)
  const warnings = [...execution.warnings, ...(extra.warnings ?? [])]
  if (kept.length < all.length) {
    warnings.push(`${all.length - kept.length} post(s) fell outside the requested window`)
  }
  if (execution.coverage.unsupportedEntries > 0) {
    warnings.push(
      `${execution.coverage.unsupportedEntries} timeline entries could not be read; ` +
        'this batch was only partly understood'
    )
  }

  const status = statusFor(stopReason, kept.length, warnings.length > 0)

  return {
    evidence_id: execution.id,
    query: execution.query,
    effective_args: args,
    status,
    stop_reason: stopReason,
    started_at: new Date(startedAt).toISOString(),
    finished_at: new Date().toISOString(),
    posts: kept,
    batches: execution.batches.slice(0, 40),
    coverage: {
      entries: execution.coverage.entries,
      tweet_entries: execution.coverage.tweetEntries,
      unsupported_entries: execution.coverage.unsupportedEntries,
      drift_reason: execution.driftReason,
    },
    cache_age_seconds: extra.cacheAgeSeconds ?? null,
    warnings: warnings.slice(0, 12),
  }
}

export interface ExecuteOptions {
  /** Aborted when the user stops, the panel closes, or the backend cancels. */
  signal: AbortSignal
  /** Called as unique posts accumulate, so the claim lease can be renewed. */
  onProgress?: (collected: number) => void
}

/**
 * Do one model-issued search, then hand back exactly what happened.
 *
 * The overlay lives and dies with this call: it is raised here and removed in
 * `finally`, so a navigation error, a cancellation, or a thrown parser all leave
 * the page back under the user's control.
 */
export const executeSearchX = async (
  args: SearchXArgs,
  options: ExecuteOptions
): Promise<SearchXResult> => {
  const startedAt = Date.now()
  const query = normalizeQuery(args.query)
  const mode: SearchMode = args.mode === 'top' ? 'top' : 'latest'
  const target = Math.max(1, args.max_posts)

  abort = new AbortController()
  const signal = abort.signal
  const forward = () => abort?.abort('cancelled')
  options.signal.addEventListener('abort', forward, { once: true })

  set({
    status: 'preparing',
    executionId: null,
    query,
    mode,
    collected: 0,
    read: 0,
    target,
    statusText: `Preparing to search X for “${query}”…`,
    stopReason: null,
  })

  try {
    if (args.freshness === 'allow_recent_cache') {
      const cached = lastCompletedFor(query, mode)
      const age = cached?.finishedAt ? Date.now() - cached.finishedAt : Infinity
      if (cached && age < CACHE_MAX_AGE_MS && cached.posts.size > 0) {
        // Honest reuse: the observation times are the original ones, so the
        // model can see this is not a fresh reading of X.
        return resultFrom(cached, args, 'cache_hit', startedAt, {
          cacheAgeSeconds: Math.round(age / 1000),
        })
      }
    }

    // Readiness before navigation. A response that arrives while nothing is
    // listening is a response this run will wait for forever.
    requestReplay()
    const execution = beginExecution(query, mode)
    set({
      status: 'navigating',
      executionId: execution.id,
      statusText: `Opening the ${mode === 'latest' ? 'Latest' : 'Top'} search for “${query}”…`,
    })

    if (!(await navigate(query, mode, signal))) {
      return resultFrom(execution, args, 'navigation_failed', startedAt)
    }

    // Wait for a response that belongs to *this* execution, not merely for time
    // to pass. A matching URL is not evidence that X went to the network.
    const deadline = Date.now() + FIRST_BATCH_TIMEOUT_MS
    while (execution.batches.length === 0 && Date.now() < deadline && !signal.aborted) {
      await wait(250, signal)
    }

    if (signal.aborted) return resultFrom(execution, args, 'interrupted', startedAt)

    const transport = transportStop(startedAt)
    if (transport) return resultFrom(execution, args, transport, startedAt)

    if (execution.batches.length === 0) {
      return resultFrom(execution, args, 'refresh_not_observed', startedAt, {
        warnings: ['X did not issue a network request for this search within the wait window'],
      })
    }

    set({ status: 'collecting' })

    let stopReason: SearchXStopReason = 'no_progress'
    let previous = execution.posts.size
    let previousRead = 0
    let stagnant = 0
    const readPostIds = new Set<string>()
    const currentHighlight: { article: HTMLElement | null } = { article: null }

    for (let step = 0; step < MAX_SCROLLS; step += 1) {
      if (signal.aborted) return resultFrom(execution, args, 'interrupted', startedAt)

      const collected = execution.posts.size
      options.onProgress?.(collected)
      set({
        collected,
        statusText: collected
          ? `Collected ${collected} post${collected === 1 ? '' : 's'} for “${query}”`
          : `Waiting for posts about “${query}”…`,
      })

      const finishedReading = await readVisiblePosts(
        execution,
        readPostIds,
        target,
        signal,
        (read) => set({ read, statusText: `Reading post ${read} of ${target}…` }),
        currentHighlight
      )
      if (!finishedReading) return resultFrom(execution, args, 'interrupted', startedAt)

      if (collected >= target && readPostIds.size >= target) {
        stopReason = 'target_reached'
        break
      }
      if (Date.now() - startedAt > MAX_RUN_MS) {
        stopReason = 'time_budget'
        break
      }

      stagnant = collected === previous && readPostIds.size === previousRead ? stagnant + 1 : 0
      previous = collected
      previousRead = readPostIds.size

      if (stagnant >= NO_PROGRESS_LIMIT) {
        // Bottom of the page plus no new batches is the only combination that
        // means "there is nothing more". A scroll that triggered no request at
        // all proves nothing on its own.
        const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 200
        stopReason = atBottom ? 'timeline_exhausted' : 'no_progress'
        break
      }

      window.scrollBy({
        top: SCROLL_MIN + Math.round(Math.random() * SCROLL_RANGE),
        behavior: 'smooth',
      })
      await wait(PAUSE_MIN_MS + Math.round(Math.random() * PAUSE_RANGE_MS), signal)

      if (step === MAX_SCROLLS - 1) stopReason = 'step_budget'
    }

    const late = transportStop(startedAt)
    if (late && execution.posts.size === 0) {
      return resultFrom(execution, args, late, startedAt)
    }
    if (execution.driftReason && execution.posts.size === 0) {
      return resultFrom(execution, args, 'parser_drift', startedAt)
    }

    set({ status: 'finalizing', statusText: 'Keeping what was collected…' })
    return resultFrom(execution, args, stopReason, startedAt)
  } finally {
    document
      .querySelectorAll<HTMLElement>(`${TWEET_SELECTOR}.${READING_CLASS}`)
      .forEach((article) => article.classList.remove(READING_CLASS))
    options.signal.removeEventListener('abort', forward)
    if (state.executionId) endExecution(state.executionId)
    abort = null
    // The overlay watches `status`. Going back to idle is what takes it down,
    // and nothing about reaching here is conditional on how the run ended.
    set(IDLE)
  }
}

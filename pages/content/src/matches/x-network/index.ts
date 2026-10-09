/**
 * Reads X's own network traffic, from inside X's own page.
 *
 * It asks X for nothing. Everything here is already on its way to the page when
 * we see it, which is what makes this safe to run on somebody's real account:
 * there is no extra request to rate-limit, no pattern to look automated, and
 * nothing that would not have happened anyway.
 *
 * Runs in the MAIN world — declared in the manifest, not injected as a <script>
 * tag. A tag is subject to the page's CSP and x.com blocks it; the upstream
 * project this was forked from tried exactly that in August 2025 and reverted
 * three minutes later. The declarative form is not subject to it.
 *
 * At `document_start`, so the hook is in place before X's bundle has a chance to
 * take its own reference to the prototype method.
 *
 * What it captures is an envelope, not just a body. Which query the response
 * belongs to, when the request left and when it came back are the three facts a
 * research run needs to tell a fresh batch from a stale one — and they are only
 * knowable here, at the request itself. The visible URL is not a substitute: it
 * changes before the response it caused arrives.
 */

const EVENT = 'catalyst:x-response'
/** The panel announces itself here once it is listening. */
const READY = 'catalyst:x-ready'
/** The collector confirms that a capture has been processed. */
const ACK = 'catalyst:x-ack'

/** Matched by operation NAME. The queryId in the path rotates; the name does not. */
const GRAPHQL = /\/i\/api\/graphql\/[^/]+\/([A-Za-z0-9_]+)/

const WANTED = new Set([
  'SearchTimeline',
  'HomeTimeline',
  'HomeLatestTimeline',
  'UserTweets',
  'TweetDetail',
])

/** Refuse anything implausible rather than posting megabytes across the bridge. */
const MAX_BODY_BYTES = 4_000_000

interface Captured {
  /** Stable across replays, so a reconnecting collector can deduplicate. */
  captureId: string
  /** Monotonic within this page. The collector acknowledges up to a sequence. */
  sequence: number
  operation: string
  url: string
  status: number
  /** Serialised here: a parsed object does not survive the world boundary intact. */
  body: string
  requestedAt: number
  capturedAt: number
  /** X's own `rawQuery` for a search, read off the request, not the address bar. */
  query?: string
  /** `Latest`, `Top`, `People`… — which tab of the search this response is. */
  product?: string
  /** The pagination cursor this request asked from, when it asked from one. */
  cursor?: string
}

/**
 * Captures the collector has not acknowledged.
 *
 * This script runs at `document_start`; the panel's React tree mounts a good
 * deal later. The first timeline X fetches — the one holding the posts the user
 * is actually looking at — lands in that gap, and without a buffer it is
 * dispatched to nobody and gone. The panel then says it has read nothing about a
 * ticker on a page full of posts about it.
 *
 * Bounded three ways, because any one of them alone has a runaway case: a long
 * session overflows the count, one huge timeline overflows the bytes, and a tab
 * left open overnight keeps responses nobody wants.
 */
const backlog: Captured[] = []
const MAX_BACKLOG = 32
const MAX_BACKLOG_BYTES = 12_000_000
const MAX_BACKLOG_AGE_MS = 10 * 60 * 1000
let backlogBytes = 0
let listening = false
let sequence = 0

const trim = (): void => {
  const oldest = Date.now() - MAX_BACKLOG_AGE_MS
  while (
    backlog.length > MAX_BACKLOG ||
    backlogBytes > MAX_BACKLOG_BYTES ||
    (backlog.length > 0 && backlog[0].capturedAt < oldest)
  ) {
    const removed = backlog.shift()
    if (!removed) break
    backlogBytes -= removed.body.length
  }
}

const dispatch = (captured: Captured): void => {
  try {
    document.dispatchEvent(new CustomEvent(EVENT, { detail: JSON.stringify(captured) }))
  } catch {
    // A listener that throws is not our problem to solve, and must not become
    // X's problem either.
  }
}

const publish = (captured: Captured): void => {
  // Kept either way. A listener can disappear — a reload, an unmount, a crashed
  // render — and "somebody was listening a moment ago" is not evidence that this
  // response was delivered. It leaves the buffer on acknowledgement, not on
  // dispatch.
  backlog.push(captured)
  backlogBytes += captured.body.length
  trim()
  if (listening) dispatch(captured)
}

const acknowledge = (sequence: number): void => {
  while (backlog.length > 0 && backlog[0].sequence <= sequence) {
    const removed = backlog.shift()
    if (removed) backlogBytes -= removed.body.length
  }
}

document.addEventListener(ACK, (event: Event) => {
  const detail = (event as CustomEvent<{ sequence?: number } | undefined>).detail
  if (typeof detail?.sequence === 'number' && detail.sequence > 0) {
    acknowledge(detail.sequence)
  }
})

/**
 * Replay from where the collector says it got to.
 *
 * `ackSequence` is the last capture it has. A reconnect asks again from there,
 * so nothing in the gap is lost and nothing already stored is counted twice.
 */
document.addEventListener(READY, (event: Event) => {
  listening = true
  const detail = (event as CustomEvent<{ ackSequence?: number } | undefined>).detail
  const acknowledged = typeof detail?.ackSequence === 'number' ? detail.ackSequence : 0
  for (const captured of [...backlog]) {
    if (captured.sequence > acknowledged) dispatch(captured)
  }
  // Everything at or below the acknowledged mark is the collector's problem now.
  acknowledge(acknowledged)
})

const operationOf = (url: string): string | undefined => {
  const name = GRAPHQL.exec(url)?.[1]
  return name && WANTED.has(name) ? name : undefined
}

/**
 * Query, product and cursor, from the request X actually made.
 *
 * X sends these as a JSON `variables` parameter. Reading them here rather than
 * from `location.search` is what makes a late response attributable: by the time
 * one arrives the address bar may already be showing the next search.
 */
const variablesOf = (url: string): Pick<Captured, 'query' | 'product' | 'cursor'> => {
  try {
    const raw = new URL(url, window.location.origin).searchParams.get('variables')
    if (!raw) return {}
    const variables = JSON.parse(raw) as Record<string, unknown>
    const query = variables.rawQuery ?? variables.querySource
    return {
      query: typeof query === 'string' ? query : undefined,
      product: typeof variables.product === 'string' ? variables.product : undefined,
      cursor: typeof variables.cursor === 'string' ? variables.cursor : undefined,
    }
  } catch {
    return {}
  }
}

const newId = (): string =>
  `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

const record = (
  operation: string,
  url: string,
  status: number,
  body: string,
  requestedAt: number
): void => {
  if (!body || body.length > MAX_BODY_BYTES) return
  sequence += 1
  publish({
    captureId: newId(),
    sequence,
    operation,
    url,
    status,
    body,
    requestedAt,
    capturedAt: Date.now(),
    ...variablesOf(url),
  })
}

const installXhr = (): void => {
  // Captured now, at document_start. If X's bundle has already taken its own
  // reference by the time this runs, patching the prototype achieves nothing —
  // which is the whole reason this file is not a content script at document_idle.
  const open = XMLHttpRequest.prototype.open
  const send = XMLHttpRequest.prototype.send

  type Tracked = XMLHttpRequest & { __catalystUrl?: string; __catalystStart?: number }

  XMLHttpRequest.prototype.open = function (
    this: Tracked,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    try {
      this.__catalystUrl = String(url)
    } catch {
      // Never let bookkeeping break the request itself.
    }

    return open.apply(this, [method, url, ...rest] as never)
  } as typeof XMLHttpRequest.prototype.open

  XMLHttpRequest.prototype.send = function (this: Tracked, ...args: unknown[]) {
    const url = this.__catalystUrl
    const operation = url ? operationOf(url) : undefined

    if (operation) {
      const requestedAt = Date.now()
      this.addEventListener('load', () => {
        try {
          // `responseType` is '' or 'text' for X's GraphQL calls. Touching
          // `responseText` on any other type throws, so it is guarded rather
          // than assumed.
          if (this.responseType !== '' && this.responseType !== 'text') return
          record(operation, url!, this.status, this.responseText, requestedAt)
        } catch {
          // Reading a response must never break the page that made it.
        }
      })
    }

    return send.apply(this, args as never)
  } as typeof XMLHttpRequest.prototype.send
}

/**
 * The same, for `fetch`.
 *
 * X has used XHR for its GraphQL calls every time this was measured, but that is
 * an observation about one build of one site, not a contract. A clone is read;
 * the original body is handed back untouched and un-awaited, so X's own parse is
 * neither consumed nor delayed.
 */
const installFetch = (): void => {
  const original = window.fetch
  if (typeof original !== 'function') return

  window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
    const input = args[0]
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : ((input as Request | undefined)?.url ?? '')
    const operation = url ? operationOf(url) : undefined
    const requestedAt = Date.now()

    const response = original.apply(this as never, args)
    if (!operation) return response

    return response.then((result) => {
      try {
        result
          .clone()
          .text()
          .then((body) => record(operation, url, result.status, body, requestedAt))
          .catch(() => undefined)
      } catch {
        // A body that cannot be cloned is one we do not read. X keeps its own.
      }
      return result
    })
  } as typeof fetch
}

installXhr()
installFetch()

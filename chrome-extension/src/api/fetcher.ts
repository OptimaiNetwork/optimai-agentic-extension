import {
  CATALYST_API_URL,
  CHAINS,
  DEFAULT_CHAIN,
  isAllowedApiPath,
  isChainId,
  isVenueId,
  SESSION_HEADER,
  venueDescriptor,
} from '@extension/shared'
import type { ApiRequest, ApiResponse, ChainId, VenueId } from '@extension/shared'

/** Matches the axios timeout the panel used to carry. */
const TIMEOUT_MS = 15_000

/**
 * A ceiling on what a caller may ask for, not a new default.
 *
 * Agent calls acknowledge in milliseconds — a turn runs in the background and
 * is polled — so nothing here should need a long timeout. Letting the panel name
 * one anyway is how a hung backend turns into a request that never returns.
 */
const MAX_TIMEOUT_MS = 30_000

const BASE = CATALYST_API_URL.replace(/\/$/, '')

/**
 * Every request asks the server to inline logos.
 *
 * The catalogs answer with `logo_url` (an issuer CDN, or `/static/stock-logos/`
 * on our server), which another app loads directly. The panel draws inside
 * x.com and other pages whose CSP blocks both, so `?logo=inline` has the server
 * put the image itself in `logo`. Routes without logos ignore it.
 */
const LOGO_PARAM = 'logo'
const LOGO_INLINE = 'inline'

class RefusedPath extends Error {}

/**
 * Only chain-owned routes have a chain prefix. Agent, catalyst and other
 * shared endpoints stay at the root even while the panel is reading Solana.
 * Keeping this decision here prevents a chain switch from turning
 * `/agent/...` into a route the server never mounted.
 *
 * Looked up rather than trusted: the panel names a chain id, not a path, so an
 * unknown value falls back to the default instead of becoming a path segment.
 * The allowlist is still checked against the bare route, which keeps it one
 * list rather than one per chain.
 */
// A balance belongs to a wallet on a chain, so it is scoped exactly like the
// quote it is read beside. Leaving it out sent every request to `/trade/balance`
// with no prefix, which 404s on a server that mounts one trade router per venue.
const CHAIN_SCOPED_PATHS = [/^\/stocks(?:\/|$)/, /^\/trade\/(?:quote|execute|balance)$/] as const

const isChainScopedPath = (path: string): boolean =>
  CHAIN_SCOPED_PATHS.some((pattern) => pattern.test(path))

const prefixFor = (
  path: string,
  chain: ChainId | undefined,
  venue: VenueId | undefined
): string => {
  if (!isChainScopedPath(path)) return ''
  if (isVenueId(venue)) {
    // Venue/chain together identify the listing. Passing an invalid pair to
    // `venueDescriptor` fails closed instead of sending a token request to the
    // other chain's same ticker.
    return venueDescriptor(venue, isChainId(chain) ? chain : undefined).pathPrefix
  }
  // Legacy messages from an older panel only carried a chain.
  return CHAINS[isChainId(chain) ? chain : DEFAULT_CHAIN].pathPrefix
}

const urlFor = (
  path: string,
  params: ApiRequest['params'],
  chain?: ChainId,
  venue?: VenueId
): string => {
  if (!isAllowedApiPath(path)) {
    throw new RefusedPath(`Refusing to fetch ${path}`)
  }

  const url = new URL(`${BASE}${prefixFor(path, chain, venue)}${path}`)
  // Belt and braces: even an allowed path must not have moved the origin.
  if (url.origin !== new URL(BASE).origin) {
    throw new RefusedPath(`Refusing to leave ${new URL(BASE).origin}`)
  }

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  if (!url.searchParams.has(LOGO_PARAM)) url.searchParams.set(LOGO_PARAM, LOGO_INLINE)
  return url.toString()
}

const headersFor = (request: ApiRequest): HeadersInit | undefined => {
  const headers: Record<string, string> = {}
  if (request.body !== undefined) headers['Content-Type'] = 'application/json'
  // One header, one field. The panel cannot name the header, so a capability
  // cannot be talked into travelling somewhere it does not belong.
  if (request.capability) headers[SESSION_HEADER] = request.capability
  return Object.keys(headers).length ? headers : undefined
}

/**
 * The server's own error code, when it sent one.
 *
 * `SESSION_EXPIRED` and `RUN_CANCELLED` are both 409-ish conditions the panel has
 * to act on differently — start over versus stop polling — and a status code
 * alone cannot tell them apart.
 */
const failureFrom = async (response: Response): Promise<ApiResponse<never>> => {
  let detail = `HTTP ${response.status}`
  let code: string | undefined
  try {
    const body = (await response.json()) as {
      detail?: string
      code?: string
      suggested_venue?: string
    }
    if (typeof body?.detail === 'string') detail = body.detail
    if (typeof body?.code === 'string') code = body.code
    if (typeof body?.suggested_venue === 'string') {
      return {
        ok: false,
        status: response.status,
        error: detail,
        code,
        suggested_venue: body.suggested_venue,
      }
    }
  } catch {
    // A non-JSON error body is still an error; the status stands on its own.
  }
  return { ok: false, status: response.status, error: detail, code }
}

export const fetchForPanel = async <T>(request: ApiRequest): Promise<ApiResponse<T>> => {
  let target: string
  try {
    target = urlFor(request.path, request.params, request.chain, request.venue)
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : 'Refused' }
  }

  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    Math.min(request.timeoutMs ?? TIMEOUT_MS, MAX_TIMEOUT_MS)
  )

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: headersFor(request),
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: controller.signal,
    })

    if (!response.ok) return failureFrom(response)
    return { ok: true, status: response.status, data: (await response.json()) as T }
  } catch (error) {
    // A dev server that is not running is the common case here, and it should
    // read as one rather than as a bug in the panel.
    const reason = error instanceof Error ? error.message : 'Request failed'
    return { ok: false, status: 0, error: reason }
  } finally {
    clearTimeout(timer)
  }
}

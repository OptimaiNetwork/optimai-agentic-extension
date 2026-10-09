import { getSelection } from '@x/modules/venue'
import type { ApiRequest, ApiResponse } from '@extension/shared'

/**
 * An error the caller can branch on.
 *
 * `SESSION_EXPIRED` means open a new conversation; `RUN_CANCELLED` means stop
 * delivering results. Both arrive as failed requests, and a run controller that
 * can only read a message string has to guess between them.
 */
export class CatalystApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly suggestedVenue?: string
  ) {
    super(message)
    this.name = 'CatalystApiError'
  }
}

/**
 * Talks to our own backend — through the background, not from here.
 *
 * Not axios and not a direct fetch. Chrome attributes a content script's request
 * to the *page's* origin, so calling `http://localhost:8787` from x.com is a
 * public https site reaching into the loopback address space. Chrome 153 refuses
 * it before a packet leaves: "Permission was denied for this request to access
 * the `loopback` address space". That permission belongs to the site, so there
 * is nothing x.com can be made to do and no header the server can send — the
 * `Access-Control-Allow-Private-Network` route is the older, superseded model.
 *
 * Every stub in the e2e suite answered this call before the network, which is
 * how the product reached a green suite while doing nothing at all on real X.
 *
 * The shape below is axios's on purpose: call sites destructure `{ data }` and
 * expect a throw on a non-2xx, and none of them needed to change.
 */
const ask = async <T>(
  request: Omit<ApiRequest, 'type'> & {
    selection?: { venue?: ApiRequest['venue']; chain?: ApiRequest['chain'] }
  }
): Promise<{ data: T }> => {
  const selection = getSelection()
  const response = (await chrome.runtime.sendMessage({
    type: 'api:request',
    // Stamped here, at the one place every call passes through, so no call site
    // has to remember to and none can disagree with the switcher.
    chain: request.selection?.chain ?? selection.chain,
    venue: request.selection?.venue ?? selection.venue,
    ...request,
    selection: undefined,
  })) as ApiResponse<T> | undefined

  if (!response) {
    // In MV3 this usually means the service worker was asleep and the message
    // was dropped rather than queued.
    throw new CatalystApiError('The extension background did not respond', 0)
  }
  if (!response.ok) {
    throw new CatalystApiError(
      response.error,
      response.status,
      response.code,
      response.suggested_venue
    )
  }

  return { data: response.data }
}

interface RequestOptions {
  params?: ApiRequest['params']
  capability?: string
  timeoutMs?: number
  selection?: { venue?: ApiRequest['venue']; chain?: ApiRequest['chain'] }
}

const catalystClient = {
  get: <T>(path: string, config?: RequestOptions) =>
    ask<T>({
      method: 'GET',
      path,
      params: config?.params,
      capability: config?.capability,
      timeoutMs: config?.timeoutMs,
      selection: config?.selection,
    }),
  post: <T>(path: string, body?: unknown, config?: Omit<RequestOptions, 'params'>) =>
    ask<T>({
      method: 'POST',
      path,
      body,
      capability: config?.capability,
      timeoutMs: config?.timeoutMs,
      selection: config?.selection,
    }),
}

export default catalystClient

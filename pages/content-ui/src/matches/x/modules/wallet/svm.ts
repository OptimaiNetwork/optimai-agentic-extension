/**
 * The panel's half of the Solana bridge.
 *
 * EVM goes through the background, because MetaMask answers an
 * `externally_connectable` port with an EIP-1193 provider. Solana cannot: that
 * same port is given no multichain stream when the caller is an extension, so
 * MetaMask's Solana account is reachable only from the page. The MAIN-world
 * script in `pages/content/src/matches/svm-wallet` holds that end; this is the
 * request/response side of the `window.postMessage` between them.
 *
 * Two namespaces, two transports, one wallet — the asymmetry is MetaMask's, not
 * ours, and it is why `client.ts` routes by namespace rather than sending
 * everything to one place.
 */

const REQUEST = 'catalyst:svm-request'
const RESPONSE = 'catalyst:svm-response'

/**
 * A status probe answers from a listener already in the page, so this only has
 * to outlast a slow frame. When it does expire the answer is "no wallet here",
 * which is also the truth when the MAIN-world script failed to load.
 */
const STATUS_TIMEOUT_MS = 3_000

/**
 * Connecting and signing open MetaMask's own window, and a person may take a
 * while over it. Long enough not to cut anybody off, bounded so a dropped
 * bridge cannot leave a promise pending for the life of the tab.
 */
const INTERACTIVE_TIMEOUT_MS = 5 * 60_000

export interface SvmStatus {
  installed: boolean
  address: string | null
  /** Which wallet answered, for a message that names it. */
  wallet?: string | null
}

type Action = 'status' | 'connect' | 'sign'

interface BridgeResponse {
  type: typeof RESPONSE
  id: string
  ok: boolean
  data?: unknown
  error?: string
}

const isResponse = (data: unknown, id: string): data is BridgeResponse =>
  typeof data === 'object' &&
  data !== null &&
  (data as { type?: unknown }).type === RESPONSE &&
  (data as { id?: unknown }).id === id

let counter = 0

const ask = <T>(
  action: Action,
  payload: Record<string, unknown> = {},
  timeout: number
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const id = `svm-${Date.now()}-${counter++}`

    const done = (settle: () => void) => {
      window.removeEventListener('message', listener)
      window.clearTimeout(timer)
      settle()
    }

    const listener = (event: MessageEvent) => {
      if (event.source !== window || !isResponse(event.data, id)) return
      const response = event.data
      done(() =>
        response.ok
          ? resolve(response.data as T)
          : reject(new Error(response.error || 'The Solana wallet refused the request'))
      )
    }

    const timer = window.setTimeout(
      () => done(() => reject(new Error('The Solana wallet bridge did not answer'))),
      timeout
    )

    window.addEventListener('message', listener)
    window.postMessage({ type: REQUEST, id, action, ...payload }, window.location.origin)
  })

/**
 * Never throws. A missing bridge and a missing wallet are the same answer to
 * the screen — "no Solana wallet here" — and the buy button reads that state,
 * not an exception.
 */
export const svmStatus = async (): Promise<SvmStatus> => {
  try {
    return await ask<SvmStatus>('status', {}, STATUS_TIMEOUT_MS)
  } catch {
    return { installed: false, address: null, wallet: null }
  }
}

export const svmConnect = (): Promise<SvmStatus> =>
  ask<SvmStatus>('connect', {}, INTERACTIVE_TIMEOUT_MS)

export const svmSign = (serializedTransaction: string): Promise<{ signedTransaction: string }> =>
  ask<{ signedTransaction: string }>(
    'sign',
    { transaction: serializedTransaction },
    INTERACTIVE_TIMEOUT_MS
  )

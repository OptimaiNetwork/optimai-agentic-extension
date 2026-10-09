/**
 * The Solana half of the platform, stood in for.
 *
 * EVM leaves through `chrome.runtime.sendMessage`, so the `chrome` shim covers
 * it. Solana does not: MetaMask gives an extension-to-extension port an
 * EIP-1193 provider and no multichain stream, so the panel reaches its Solana
 * account through a MAIN-world script over `window.postMessage`. Out here there
 * is no MAIN-world script, and without one `svmStatus()` waits three seconds and
 * then reports "no wallet" — which is a real state worth designing for, but a
 * poor default when the thing being designed is the connected one.
 *
 * So: the same two message types, answered from the page. The panel cannot tell
 * the difference, which is the whole point.
 */

const REQUEST = 'catalyst:svm-request'
const RESPONSE = 'catalyst:svm-response'

/**
 * A real-looking base58 pubkey. Fixed, so its identicon never moves.
 *
 * Overridable at runtime because the panel reads a real balance for whatever
 * address is connected, and this one holds nothing — so the funded half of the
 * balance line, including the Max button, could not be seen without pointing
 * the harness at a wallet that has something in it. Set
 * `catalyst-dev:svm-address` in localStorage and reload. Deliberately not a
 * hardcoded stranger's wallet: this repo is going public.
 */
const FALLBACK_ADDRESS = '7xKXtg2CW3pVnbnWoiTPZFUWzS8JcpBpyDzM9mLTm8Ax'

const readAddress = (): string => {
  try {
    return localStorage.getItem('catalyst-dev:svm-address') || FALLBACK_ADDRESS
  } catch {
    return FALLBACK_ADDRESS
  }
}

const ADDRESS = readAddress()

export const devSvmWallet = {
  installed: true,
  address: ADDRESS,
  /** Long enough that "connecting…" is visible; short enough not to annoy. */
  latencyMs: 700,
  reject: null as string | null,
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface Request {
  type: typeof REQUEST
  id: string
  action: 'status' | 'connect' | 'sign'
  transaction?: string
}

const isRequest = (data: unknown): data is Request =>
  typeof data === 'object' && data !== null && (data as { type?: unknown }).type === REQUEST

const answer = (id: string, body: { ok: boolean; data?: unknown; error?: string }) =>
  window.postMessage({ type: RESPONSE, id, ...body }, window.location.origin)

const status = () => ({
  installed: devSvmWallet.installed,
  address: devSvmWallet.installed ? devSvmWallet.address : null,
  wallet: devSvmWallet.installed ? 'MetaMask' : null,
})

export const installSvmBridge = (): void => {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window || !isRequest(event.data)) return
    const { id, action } = event.data

    void (async () => {
      if (action === 'status') return answer(id, { ok: true, data: status() })

      await wait(devSvmWallet.latencyMs)

      if (!devSvmWallet.installed) {
        return answer(id, { ok: false, error: 'No Solana wallet in this browser' })
      }
      if (devSvmWallet.reject) {
        return answer(id, { ok: false, error: devSvmWallet.reject })
      }
      if (action === 'connect') return answer(id, { ok: true, data: status() })
      // `sign` hands back something shaped like a signed transaction. Nothing
      // out here broadcasts it, and nothing should.
      return answer(id, { ok: true, data: { signedTransaction: `dev-signed:${id}` } })
    })()
  })
}

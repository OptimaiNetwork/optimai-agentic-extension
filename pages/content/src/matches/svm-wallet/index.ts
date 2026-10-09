/**
 * MetaMask's Solana account, reached from the page rather than the background.
 *
 * Why this file exists at all: MetaMask serves its Solana (CAIP-25 / multichain)
 * API **only to web pages**. Reading its shipped background bundle
 * (13.48.0.0, `9380.*.js`) the external-connection handler is:
 *
 *     if (port.sender.id) setupUntrustedCommunicationEip1193(stream, sender)
 *     else                setupUntrustedCommunicationCaip(caipStream(stream), sender)
 *
 * — and the EIP-1193 branch explicitly `ignoreStream`s the
 * `metamask-multichain-provider` substream. A connection from another
 * extension always carries `sender.id`, so every `caip-348` message our service
 * worker sent was dropped on the floor: the port opened, nothing ever answered,
 * and the panel reported "MetaMask not detected". No amount of retrying in the
 * background can fix that; the namespace is simply not served there.
 *
 * A page, on the other hand, gets the full thing: MetaMask's `inpage.js`
 * registers a Solana Wallet Standard wallet (`wallet-standard:register-wallet`,
 * `standard:connect`, `solana:signTransaction`). So the Solana half of the
 * wallet lives here, in the MAIN world of x.com, and the panel talks to it
 * across `window.postMessage`.
 *
 * MAIN world, declared in the manifest rather than injected as a `<script>`:
 * x.com's CSP blocks the tag, not the declaration — the same reason
 * `x-network` lives here.
 *
 * This bridge only ever moves three things: whether a wallet is registered, the
 * address it hands back, and a transaction the user approves in MetaMask's own
 * window. It never sees a key, and it never broadcasts: Jupiter does that.
 */

const REQUEST = 'catalyst:svm-request'
const RESPONSE = 'catalyst:svm-response'

/**
 * Wallet Standard names Solana mainnet `solana:mainnet`, not by its genesis
 * hash. Measured against MetaMask 13.48 in the page: its Solana wallet
 * advertises `['solana:mainnet','solana:devnet','solana:testnet']`, while
 * `solana:5eykt4Us…` is the CAIP-2 scope it uses internally. Matching on the
 * hash form found no wallet at all and reported MetaMask as absent.
 */
const SOLANA_MAINNET = 'solana:mainnet'
const SOLANA_PREFIX = 'solana:'
const CONNECT = 'standard:connect'
const SIGN = 'solana:signTransaction'

interface WalletAccount {
  address: string
  chains?: readonly string[]
}

interface ConnectFeature {
  connect: () => Promise<{ accounts?: readonly WalletAccount[] }>
}

interface SignFeature {
  signTransaction: (
    ...inputs: Array<{ account: WalletAccount; transaction: Uint8Array; chain?: string }>
  ) => Promise<Array<{ signedTransaction?: Uint8Array }>>
}

interface StandardWallet {
  name: string
  chains: readonly string[]
  accounts: readonly WalletAccount[]
  features: Record<string, unknown>
}

interface RegisterApi {
  register: (...wallets: StandardWallet[]) => () => void
}

type Action = 'status' | 'connect' | 'sign'

interface BridgeRequest {
  type: typeof REQUEST
  id: string
  action: Action
  transaction?: string
}

/**
 * The Wallet Standard app protocol, by hand.
 *
 * `@wallet-standard/app` is eleven lines of event plumbing around this, and a
 * MAIN-world IIFE that runs on every x.com page load is the one place where a
 * dependency has to earn itself. Listening *and* dispatching is what makes the
 * order irrelevant: a wallet that loaded first answers the ready event, one
 * that loads later announces itself.
 */
const wallets = new Set<StandardWallet>()

const api: RegisterApi = Object.freeze({
  register: (...registered: StandardWallet[]) => {
    for (const wallet of registered) wallets.add(wallet)
    return () => {
      for (const wallet of registered) wallets.delete(wallet)
    }
  },
})

try {
  window.addEventListener('wallet-standard:register-wallet', (event) => {
    const callback = (event as CustomEvent<(api: RegisterApi) => void>).detail
    if (typeof callback === 'function') callback(api)
  })
  window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: api }))
} catch {
  // A page that refuses these events simply has no Solana wallet, which the
  // status reply below already describes.
}

const usable = (wallet: StandardWallet): boolean =>
  Array.isArray(wallet.chains) &&
  // Any Solana chain identifier, so a wallet that only publishes the CAIP-2
  // form is still found. MetaMask registers a Bitcoin wallet under the same
  // name, which is exactly what this filters out.
  wallet.chains.some((chain) => chain.startsWith(SOLANA_PREFIX)) &&
  Boolean(wallet.features?.[CONNECT]) &&
  Boolean(wallet.features?.[SIGN])

/**
 * MetaMask first, then any other Solana wallet that can sign.
 *
 * Preferring by name rather than accepting the first registration matters on a
 * machine with Phantom installed as well: the panel says "MetaMask" throughout,
 * and signing with a different wallet than the one named is the kind of
 * surprise a purchase screen must not spring.
 */
const pick = (): StandardWallet | null => {
  const candidates = [...wallets].filter(usable)
  return candidates.find((wallet) => /metamask/i.test(wallet.name)) ?? candidates[0] ?? null
}

let connected: WalletAccount | null = null

const bytesFromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0))

const base64FromBytes = (value: Uint8Array): string => {
  let binary = ''
  // Chunked: spreading a whole transaction into String.fromCharCode overflows
  // the argument limit on anything but a trivially small one.
  for (let index = 0; index < value.length; index += 0x8000) {
    binary += String.fromCharCode(...value.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

const featureOf = <T>(wallet: StandardWallet, name: string): T | null =>
  (wallet.features?.[name] as T | undefined) ?? null

const readStatus = () => {
  const wallet = pick()
  if (!wallet) return { installed: false, address: null, wallet: null }
  return {
    installed: true,
    // A wallet that restored its own session already lists an account, and the
    // panel should show that rather than asking for a connection it has.
    address: connected?.address ?? wallet.accounts[0]?.address ?? null,
    wallet: wallet.name,
  }
}

const connect = async () => {
  const wallet = pick()
  if (!wallet) throw new Error('No Solana wallet is available on this page')

  const feature = featureOf<ConnectFeature>(wallet, CONNECT)
  if (!feature) throw new Error(`${wallet.name} cannot connect a Solana account`)

  const { accounts = [] } = await feature.connect()
  const account = accounts[0] ?? wallet.accounts[0]
  if (!account) throw new Error(`${wallet.name} shared no Solana account`)

  connected = account
  return { installed: true, address: account.address, wallet: wallet.name }
}

const sign = async (serialized: string | undefined) => {
  if (!serialized) throw new Error('Nothing to sign')

  const wallet = pick()
  if (!wallet) throw new Error('No Solana wallet is available on this page')
  if (!connected) await connect()
  if (!connected) throw new Error('No Solana account is connected')

  const feature = featureOf<SignFeature>(wallet, SIGN)
  if (!feature) throw new Error(`${wallet.name} cannot sign a Solana transaction`)

  const [result] = await feature.signTransaction({
    account: connected,
    transaction: bytesFromBase64(serialized),
    // Named explicitly: the wallet validates the chain against the account's
    // own list, and mainnet is the only one this product ever quotes.
    chain: wallet.chains.find((chain) => chain === SOLANA_MAINNET) ?? SOLANA_MAINNET,
  })
  if (!result?.signedTransaction) throw new Error(`${wallet.name} returned no signed transaction`)

  return { signedTransaction: base64FromBytes(result.signedTransaction) }
}

const reply = (id: string, body: Record<string, unknown>) =>
  window.postMessage({ type: RESPONSE, id, ...body }, window.location.origin)

const isRequest = (data: unknown): data is BridgeRequest =>
  typeof data === 'object' &&
  data !== null &&
  (data as { type?: unknown }).type === REQUEST &&
  typeof (data as { id?: unknown }).id === 'string'

window.addEventListener('message', (event) => {
  // Same window only. A frame — an embedded tweet, an ad — must not be able to
  // ask this page's MetaMask to sign anything.
  if (event.source !== window || !isRequest(event.data)) return

  const { id, action } = event.data
  const run = async () => {
    if (action === 'status') return readStatus()
    if (action === 'connect') return connect()
    if (action === 'sign') return sign(event.data.transaction)
    throw new Error(`Unknown wallet action ${String(action)}`)
  }

  run().then(
    (data) => reply(id, { ok: true, data }),
    (error: unknown) =>
      reply(id, {
        ok: false,
        // Structured clone crosses this boundary, and an Error does not survive
        // it usefully: the panel needs the sentence, not the prototype.
        error: error instanceof Error ? error.message : String(error),
      })
  )
})

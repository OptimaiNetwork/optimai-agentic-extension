import { createExternalExtensionProvider } from '@metamask/providers'

import { BSC_CHAIN_ID, BSC_CHAIN_PARAMS, UNRECOGNISED_CHAIN } from './chain'
import type { WalletAsset, WalletStatus, WalletTransaction } from './messages'

type Eip1193 = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>
}

interface ProviderError {
  code?: number
  message?: string
}

let provider: Eip1193 | null = null

/**
 * How long to wait for `eth_accounts` before deciding nothing is listening.
 *
 * That call needs no approval and no window, so a live MetaMask answers in
 * milliseconds; the only reason to wait at all is its service worker waking
 * from idle. Generous because the cost of being wrong is only a retry: the
 * cached provider is dropped on the way out, so the next call builds a fresh
 * port and usually succeeds.
 */
const PROBE_TIMEOUT_MS = 5_000

const timed = <T>(work: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('MetaMask did not answer')), ms)
    work.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })

/**
 * A connection to MetaMask, opened over its `externally_connectable` port.
 *
 * MetaMask's manifest accepts a port from any extension, so this needs no
 * injected script and no MAIN-world bridge — which matters, because x.com's CSP
 * forbids both.
 *
 * The provider reaches Node globals through `readable-stream`. A hand-written
 * `process.nextTick` stand-in built on `queueMicrotask` passes a smoke test and
 * then stalls it inside an extension with no error at all: `request()` simply
 * never settles. `vite-plugin-node-polyfills` is already in this package's build
 * for that reason; do not replace it with something smaller.
 */
const get = (): Eip1193 => {
  provider ??= createExternalExtensionProvider('stable') as unknown as Eip1193
  return provider
}

const codeOf = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null ? (error as ProviderError).code : undefined

export const status = async (): Promise<WalletStatus> => {
  try {
    const [accounts, chainId] = await timed(
      Promise.all([
        get().request({ method: 'eth_accounts' }) as Promise<string[]>,
        get().request({ method: 'eth_chainId' }) as Promise<string>,
      ]),
      PROBE_TIMEOUT_MS
    )
    const address = accounts?.[0] ?? null
    return {
      installed: true,
      address,
      chainId: chainId ?? null,
      onBsc: chainId === BSC_CHAIN_ID,
    }
  } catch {
    // Two different failures, one answer. Either no port opened — MetaMask is
    // absent, or is a build whose id this does not know, since Flask and Beta
    // ship under different ids — or a port that opened once has since died,
    // which `@metamask/providers` does not surface as an error: the request
    // simply never settles. Without the timeout above the panel sat on a
    // spinner for the life of the tab and `installed: false` was unreachable.
    //
    // Dropping the cached provider matters as much as reporting it. It is
    // memoised for the life of the service worker, so a MetaMask that was
    // reloaded, updated or reinstalled would keep being addressed through the
    // dead stream forever. The next call builds a new one.
    provider = null
    return { installed: false, address: null, chainId: null, onBsc: false }
  }
}

/** Prompts for an account, then makes sure it is pointed at BNB Smart Chain. */
export const connect = async (): Promise<WalletStatus> => {
  // Probe before prompting. `eth_requestAccounts` opens a window the user may
  // take a minute over, so it cannot carry a timeout of its own — but against a
  // dead port no window ever opens and it never returns either. `status()` is
  // the bounded call that tells the two apart.
  const before = await status()
  if (!before.installed) throw new Error('MetaMask did not answer')

  const accounts = (await get().request({ method: 'eth_requestAccounts' })) as string[]
  if (!accounts?.length) throw new Error('No account was shared')

  await ensureBsc()
  return status()
}

export const ensureBsc = async (): Promise<void> => {
  const chainId = (await get().request({ method: 'eth_chainId' })) as string
  if (chainId === BSC_CHAIN_ID) return

  try {
    await get().request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BSC_CHAIN_ID }],
    })
  } catch (error) {
    if (codeOf(error) !== UNRECOGNISED_CHAIN) throw error
    // The wallet has never seen this chain. Describe it, which also switches.
    await get().request({ method: 'wallet_addEthereumChain', params: [BSC_CHAIN_PARAMS] })
  }
}

/**
 * Hands a prepared transaction to the wallet and returns its hash.
 *
 * `eth_sendTransaction`, not `eth_signTransaction`: MetaMask does not implement
 * signing without sending. That rules out Binance's own
 * `/broadcast-transaction`, and with it the MEV protection that endpoint offers
 * — the API is designed around a method the most common wallet does not have.
 */
export const send = async (transaction: WalletTransaction): Promise<string> => {
  const { address, installed } = await status()
  if (!installed) throw new Error('MetaMask did not answer')
  if (!address) throw new Error('No account is connected')

  await ensureBsc()

  return (await get().request({
    method: 'eth_sendTransaction',
    params: [{ from: address, ...transaction }],
  })) as string
}

/**
 * Ask MetaMask to list an ERC-20 the user has just received.
 *
 * This is a wallet display action, not a transaction: MetaMask still shows its
 * own confirmation and the user can decline it. Keeping the request here means
 * the content script never needs direct access to the injected provider.
 */
export const watchAsset = async (asset: WalletAsset): Promise<boolean> => {
  const { installed } = await status()
  if (!installed) throw new Error('MetaMask did not answer')

  await ensureBsc()

  const options = {
    address: asset.address,
    symbol: asset.symbol,
    decimals: asset.decimals,
    ...(asset.image ? { image: asset.image } : {}),
  }

  return (await get().request({
    method: 'wallet_watchAsset',
    params: { type: 'ERC20', options },
  })) as boolean
}

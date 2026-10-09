/**
 * What the panel can ask the background to do with the wallet.
 *
 * The panel runs in a content script on x.com and cannot talk to MetaMask
 * itself: an isolated world cannot see `window.ethereum`, and a MAIN-world
 * script is bound by x.com's CSP. The background has neither problem, and it is
 * also the context MetaMask attributes the connection to — asking from a content
 * script gets the permission filed under `https://x.com`, so a wallet already
 * connected to X would be handed over with no prompt at all.
 */

/**
 * Which of MetaMask's two namespaces a call is for.
 *
 * Only `evm` travels over this port. MetaMask answers an extension-to-extension
 * connection with an EIP-1193 provider and explicitly drops the multichain
 * stream, so `svm` is served by the MAIN-world bridge
 * (`pages/content/src/matches/svm-wallet`) and never reaches the background.
 */
export type WalletNamespace = 'evm' | 'svm'

export type WalletRequest =
  | { type: 'wallet:status' }
  | { type: 'wallet:connect' }
  | { type: 'wallet:send'; transaction: WalletTransaction }
  | { type: 'wallet:watch-asset'; asset: WalletAsset }

export interface WalletTransaction {
  to: string
  data: string
  value: string
  gas?: string
  gasPrice?: string
}

export interface WalletAsset {
  address: string
  symbol: string
  decimals: number
  image?: string
}

export interface WalletStatus {
  installed: boolean
  address: string | null
  chainId: string | null
  onBsc: boolean
  /** Which namespace this status describes. Absent on older replies. */
  namespace?: WalletNamespace
}

export type WalletResponse<T> = { ok: true; data: T } | { ok: false; error: string; code?: number }

export const WALLET_MESSAGE_PREFIX = 'wallet:'

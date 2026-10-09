import { svmConnect, svmSign, svmStatus } from './svm'

/**
 * Talking to the wallet, from a panel that cannot reach it directly.
 *
 * EVM goes through the background: an isolated content script cannot see
 * `window.ethereum`, and the background is the context MetaMask files the
 * permission under — asking from a content script would file it under
 * `https://x.com`.
 *
 * Solana cannot take that route at all. MetaMask hands an extension-to-extension
 * port an EIP-1193 provider and nothing else — its multichain (CAIP) stream is
 * served only to pages — so the Solana half goes out through the MAIN-world
 * bridge in `pages/content/src/matches/svm-wallet`. See `./svm.ts`.
 */

export interface WalletStatus {
  installed: boolean
  address: string | null
  chainId: string | null
  onBsc: boolean
  namespace?: WalletNamespace
}

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

type Response<T> = { ok: true; data: T } | { ok: false; error: unknown; code?: number }

class WalletError extends Error {
  constructor(
    message: string,
    readonly code?: number
  ) {
    super(message)
    this.name = 'WalletError'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const messagesOf = (
  value: unknown,
  seen = new Set<object>(),
  messages: string[] = []
): string[] => {
  if (typeof value === 'string') {
    const message = value.trim()
    if (message && message !== '[object Object]') messages.push(message)
    return messages
  }

  if (value instanceof Error && value.message.trim()) messages.push(value.message.trim())

  if (!isRecord(value) || seen.has(value)) return messages
  seen.add(value)

  for (const key of ['message', 'reason', 'details']) {
    if (typeof value[key] === 'string' && value[key].trim()) messages.push(value[key].trim())
  }

  for (const key of ['error', 'data', 'originalError', 'cause']) {
    messagesOf(value[key], seen, messages)
  }

  return messages
}

const codeOf = (value: unknown, seen = new Set<object>()): number | undefined => {
  if (!isRecord(value) || seen.has(value)) return undefined
  seen.add(value)
  if (typeof value.code === 'number') return value.code

  for (const key of ['error', 'data', 'originalError', 'cause']) {
    const code = codeOf(value[key], seen)
    if (code !== undefined) return code
  }

  return undefined
}

const serializedOf = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined

  try {
    const serialized = JSON.stringify(value)
    return serialized && serialized !== '{}' ? serialized : undefined
  } catch {
    return undefined
  }
}

const isGenericProviderMessage = (message: string): boolean =>
  /^(internal json-rpc error\.?|execution reverted\.?|transaction failed\.?)$/i.test(message)

/** Keeps a malformed provider response from becoming `[object Object]` in UI. */
export const walletErrorMessage = (error: unknown, fallback: string): string => {
  if (codeOf(error) === 4001) return 'You closed the wallet prompt'
  const messages = messagesOf(error)
  return (
    messages.find((message) => !isGenericProviderMessage(message)) ??
    messages[0] ??
    serializedOf(error) ??
    fallback
  )
}

const ask = async <T>(message: object): Promise<T> => {
  const response = (await chrome.runtime.sendMessage(message)) as Response<T> | undefined

  if (!response) {
    // The background did not answer at all, which in MV3 usually means the
    // service worker was asleep and the message was dropped rather than queued.
    throw new WalletError('The extension background did not respond')
  }
  if (!response.ok) {
    throw new WalletError(
      walletErrorMessage(response.error, 'The wallet could not complete the request'),
      response.code
    )
  }

  return response.data
}

/**
 * Which of MetaMask's namespaces to talk to.
 *
 * `evm` signs an `eth_sendTransaction` for BNB Smart Chain; `svm` signs a
 * serialized Solana transaction that Jupiter then broadcasts. One wallet, but
 * two different doors into it, which is why each one has its own transport
 * below rather than a namespace field on a single message.
 */
export type WalletNamespace = 'evm' | 'svm'

/** A Solana answer in the shape the panel already reads for EVM. */
const asWalletStatus = (status: { installed: boolean; address: string | null }): WalletStatus => ({
  installed: status.installed,
  address: status.address,
  // Solana has no EVM chain id, and claiming BSC for it would make
  // `onBsc` mean two different things on one screen.
  chainId: null,
  onBsc: false,
  namespace: 'svm',
})

export const walletStatus = async (namespace: WalletNamespace = 'evm'): Promise<WalletStatus> =>
  namespace === 'svm'
    ? asWalletStatus(await svmStatus())
    : ask<WalletStatus>({ type: 'wallet:status' })

export const connectWallet = async (namespace: WalletNamespace = 'evm'): Promise<WalletStatus> =>
  namespace === 'svm'
    ? asWalletStatus(await svmConnect())
    : ask<WalletStatus>({ type: 'wallet:connect' })

export const sendTransaction = (transaction: WalletTransaction) =>
  ask<{ hash: string }>({ type: 'wallet:send', transaction })

/** Signs only. Jupiter broadcasts, so nothing here reaches a Solana node. */
export const signSolanaTransaction = (serializedTransaction: string) =>
  svmSign(serializedTransaction)
export const watchAsset = (asset: WalletAsset) =>
  ask<{ added: boolean }>({ type: 'wallet:watch-asset', asset })

export { WalletError }

/**
 * Which account the header is showing, and how it got there.
 *
 * Module state rather than component state, and deliberately the same shape as
 * `modules/venue`: the header unmounts and remounts on every route change, and
 * a probe that restarts each time would ask MetaMask for its status on every
 * navigation. It also means the buy screen and the header cannot end up
 * disagreeing about which namespace is in front.
 *
 * Both namespaces are kept, not just the selected one. Switching to Solana and
 * finding out only then that no bridge answered is a worse screen than showing
 * up-front which of the two is actually available, and probing both costs one
 * message each.
 */

import { useSyncExternalStore } from 'react'

import { connectWallet, walletErrorMessage, walletStatus } from './client'
import type { WalletNamespace, WalletStatus } from './client'

export const NAMESPACES: readonly WalletNamespace[] = ['evm', 'svm']

export const NAMESPACE_LABEL: Record<WalletNamespace, string> = {
  evm: 'BNB Chain',
  svm: 'Solana',
}

export interface AccountState {
  status: WalletStatus | null
  probing: boolean
  connecting: boolean
  error: string | null
}

export interface WalletAccount {
  namespace: WalletNamespace
  accounts: Record<WalletNamespace, AccountState>
}

const idle = (): AccountState => ({
  status: null,
  probing: false,
  connecting: false,
  error: null,
})

let state: WalletAccount = {
  namespace: 'evm',
  accounts: { evm: idle(), svm: idle() },
}

const listeners = new Set<() => void>()

/**
 * A fresh object every time, because `useSyncExternalStore` compares snapshots
 * by identity — mutating in place would leave the header showing the state it
 * had when it mounted.
 */
const commit = (namespace: WalletNamespace, patch: Partial<AccountState>): void => {
  state = {
    ...state,
    accounts: { ...state.accounts, [namespace]: { ...state.accounts[namespace], ...patch } },
  }
  listeners.forEach((listener) => listener())
}

const getSnapshot = (): WalletAccount => state

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Nothing here rejects: every failure is a state the header has to draw. */
const guard = async (namespace: WalletNamespace, run: () => Promise<WalletStatus>) => {
  try {
    commit(namespace, { status: await run(), error: null })
  } catch (error) {
    commit(namespace, {
      error: walletErrorMessage(error, 'The wallet could not be reached'),
    })
  }
}

let probed = false

/**
 * Read both namespaces once per document.
 *
 * A probe is not a connection — it asks what the wallet already permits and
 * opens no prompt — so doing it on mount costs the user nothing. Doing it more
 * than once does: MetaMask is woken for an answer that has not changed.
 */
export const probeWallets = (): void => {
  if (probed) return
  probed = true
  for (const namespace of NAMESPACES) {
    commit(namespace, { probing: true })
    void guard(namespace, () => walletStatus(namespace)).finally(() =>
      commit(namespace, { probing: false })
    )
  }
}

/** Opens the wallet's own prompt. Only ever from a click. */
export const connect = async (namespace: WalletNamespace): Promise<void> => {
  commit(namespace, { connecting: true, error: null })
  await guard(namespace, () => connectWallet(namespace))
  commit(namespace, { connecting: false })
}

export const selectNamespace = (namespace: WalletNamespace): void => {
  if (namespace === state.namespace) return
  state = { ...state, namespace }
  listeners.forEach((listener) => listener())
}

/** Share a connection made by a page that talks to the wallet directly. */
export const adoptWalletStatus = (namespace: WalletNamespace, status: WalletStatus): void => {
  commit(namespace, { status, error: null })
}

/**
 * The connected addresses, for callers that are not components.
 *
 * The agent turn is assembled outside React — in `agent-runtime` — and has to
 * stamp the wallets the way it stamps the venue. Reading the same store the
 * header reads keeps one source of truth; a second copy of "which wallet" is
 * how the panel and the answer come to disagree.
 */
export const connectedWallets = (): { bnb?: string; solana?: string } => ({
  bnb: state.accounts.evm.status?.address ?? undefined,
  solana: state.accounts.svm.status?.address ?? undefined,
})

export const useWalletAccount = (): WalletAccount =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

/** The selected namespace's slice, which is what the header renders. */
export const useSelectedAccount = (): AccountState & { namespace: WalletNamespace } => {
  const account = useWalletAccount()
  return { namespace: account.namespace, ...account.accounts[account.namespace] }
}

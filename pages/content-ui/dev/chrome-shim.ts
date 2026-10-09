/**
 * Enough of the extension platform for the panel to run on an ordinary page.
 *
 * The panel never reaches the network itself. Every backend call and every
 * wallet call leaves through `chrome.runtime.sendMessage`, and the two pieces of
 * state it keeps go to `chrome.storage`. That is the entire surface, which is
 * why the real panel runs out here completely unmodified — nothing under
 * `src/matches/x/` knows this file exists.
 *
 * `api:request` is answered by the extension's own `fetchForPanel` rather than
 * by a second implementation, so the path allowlist, the chain/venue prefixing
 * and the error shapes are the ones that ship. A path the extension would refuse
 * is refused here too, which is the point: a harness that is easier to satisfy
 * than production teaches you the wrong thing.
 */

import type { ApiRequest } from '@extension/shared'

import { fetchForPanel } from '../../../chrome-extension/src/api/fetcher'
import { installSvmBridge } from './svm-bridge'

/** Stands in for the tab id the background reports; one "tab" out here. */
const DEV_TAB_ID = 1

/**
 * A wallet that behaves, so the buy screen has something to render.
 *
 * Mutable because the states worth designing for are the unhappy ones — no
 * wallet installed, wrong chain, user rejects the prompt — and each of them is
 * a different screen. The dev toolbar flips these.
 */
const FALLBACK_EVM_ADDRESS = '0x8B2f3C4a91Dd7E5610aC4e3B9f0D2c7A5E6b1934'

/**
 * Overridable, for the same reason `dev/svm-bridge.ts` is: the panel reads a
 * real on-chain balance for whatever address is connected, and this one holds
 * nothing, so the funded half of the buy screen — the balance line, Max, the
 * dollar conversion of a real holding — cannot be seen against it. Set
 * `catalyst-dev:evm-address` in localStorage and reload.
 */
const readEvmAddress = (): string => {
  try {
    return localStorage.getItem('catalyst-dev:evm-address') || FALLBACK_EVM_ADDRESS
  } catch {
    return FALLBACK_EVM_ADDRESS
  }
}

export const devWallet = {
  installed: true,
  address: readEvmAddress(),
  chainId: '0x38',
  /** Milliseconds a signature prompt appears to take before it resolves. */
  latencyMs: 900,
  /** When set, `wallet:send` rejects with this instead of returning a hash. */
  reject: null as { message: string; code?: number } | null,
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const walletStatus = () => ({
  installed: devWallet.installed,
  address: devWallet.installed ? devWallet.address : null,
  chainId: devWallet.installed ? devWallet.chainId : null,
  onBsc: devWallet.installed && devWallet.chainId === '0x38',
  namespace: 'evm' as const,
})

/** A hash that looks like one, so the success screen is not designed against `undefined`. */
const fakeHash = () =>
  `0x${Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`

const handleWallet = async (message: { type: string; [key: string]: unknown }) => {
  switch (message.type) {
    case 'wallet:status':
      return { ok: true, data: walletStatus() }
    case 'wallet:connect':
      await wait(devWallet.latencyMs)
      if (!devWallet.installed) return { ok: false, error: 'MetaMask is not installed' }
      return { ok: true, data: walletStatus() }
    case 'wallet:send':
      await wait(devWallet.latencyMs)
      if (devWallet.reject) {
        return { ok: false, error: devWallet.reject.message, code: devWallet.reject.code }
      }
      return { ok: true, data: { hash: fakeHash() } }
    case 'wallet:watch-asset':
      await wait(devWallet.latencyMs)
      return { ok: true, data: { added: true } }
    default:
      return { ok: false, error: `Unknown wallet request: ${message.type}` }
  }
}

/**
 * `chrome.storage` over the page's own storage.
 *
 * The extension deliberately does *not* use page storage — on x.com that space
 * belongs to X's scripts as much as to ours. Out here there is no x.com and no
 * one else on the origin, so the objection does not apply and the lifetimes
 * still match: `local` survives a reload, `session` does not.
 */
const storageArea = (backing: Storage, prefix: string) => ({
  get: async (keys?: string | string[] | Record<string, unknown> | null) => {
    const names =
      typeof keys === 'string'
        ? [keys]
        : Array.isArray(keys)
          ? keys
          : keys
            ? Object.keys(keys)
            : Object.keys(backing)
                .filter((key) => key.startsWith(prefix))
                .map((key) => key.slice(prefix.length))

    const result: Record<string, unknown> = {}
    for (const name of names) {
      const raw = backing.getItem(prefix + name)
      if (raw === null) continue
      try {
        result[name] = JSON.parse(raw)
      } catch {
        // A value this shim did not write. Hand it back as it was found.
        result[name] = raw
      }
    }
    return result
  },
  set: async (items: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(items)) {
      backing.setItem(prefix + name, JSON.stringify(value))
    }
  },
  remove: async (keys: string | string[]) => {
    for (const name of Array.isArray(keys) ? keys : [keys]) backing.removeItem(prefix + name)
  },
  clear: async () => {
    for (const key of Object.keys(backing)) {
      if (key.startsWith(prefix)) backing.removeItem(key)
    }
  },
  setAccessLevel: async () => undefined,
})

type Message = { type?: string } & Record<string, unknown>

const sendMessage = async (message: Message): Promise<unknown> => {
  if (message?.type?.startsWith('wallet:')) {
    return handleWallet(message as { type: string })
  }
  if (message?.type === 'tab:id') {
    return { tabId: DEV_TAB_ID }
  }
  if (message?.type === 'api:request') {
    return fetchForPanel(message as unknown as ApiRequest)
  }
  // Matching the background: an unrecognised message gets no reply at all, and
  // the panel's own "the background did not respond" path is what renders.
  return undefined
}

/**
 * Installed as a side effect of importing this module, not by a call the entry
 * point has to remember to make first. ES modules evaluate a file's imports in
 * order, so `dev/main.tsx` listing this one above the panel is enough to have
 * `chrome` in place before any panel module is evaluated — and there is no way
 * to import the shim and still be too late.
 */
const installChromeShim = (): void => {
  const shim = {
    runtime: {
      sendMessage,
      // Present because MV3 code commonly probes it; nothing here reads it.
      id: 'catalyst-dev-harness',
      lastError: undefined,
      onMessage: { addListener: () => undefined, removeListener: () => undefined },
    },
    storage: {
      local: storageArea(window.localStorage, 'catalyst-dev:local:'),
      session: storageArea(window.sessionStorage, 'catalyst-dev:session:'),
      onChanged: { addListener: () => undefined, removeListener: () => undefined },
    },
  }

  Object.defineProperty(globalThis, 'chrome', { value: shim, writable: true, configurable: true })
}

installChromeShim()
// Solana never travels over `chrome.runtime`; see `dev/svm-bridge.ts`.
installSvmBridge()

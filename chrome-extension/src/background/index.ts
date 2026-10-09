import 'webextension-polyfill'

import { connect, send, status, watchAsset } from '../wallet/provider'
import { normalizeWalletError } from '../wallet/errors'
import type { WalletRequest, WalletResponse } from '../wallet/messages'
import { fetchForPanel } from '../api/fetcher'
import type { ApiRequest } from '@extension/shared'

type Reply = (response: WalletResponse<unknown>) => void

const errorOf = (error: unknown): { error: string; code?: number } => {
  const normalized = normalizeWalletError(error)
  return { error: normalized.message, code: normalized.code }
}

const handle = async (request: WalletRequest): Promise<unknown> => {
  switch (request.type) {
    // Only EVM reaches this file. MetaMask gives an extension-to-extension
    // port an EIP-1193 provider and no multichain stream, so Solana is served
    // by the MAIN-world bridge instead — see pages/content/src/matches/svm-wallet.
    case 'wallet:status':
      return status()
    case 'wallet:connect':
      return connect()
    case 'wallet:send':
      return { hash: await send(request.transaction) }
    case 'wallet:watch-asset':
      return { added: await watchAsset(request.asset) }
    default:
      throw new Error(`Unknown wallet request`)
  }
}

/**
 * The wallet lives here, not in the panel.
 *
 * A content script cannot reach MetaMask: an isolated world cannot see
 * `window.ethereum`, and a MAIN-world script is bound by x.com's CSP. The
 * background can, over MetaMask's `externally_connectable` port — and it is also
 * the context the permission gets filed under. Asking from x.com would have
 * MetaMask record the connection as `https://x.com`, which means a wallet
 * already connected to X hands over an account with no prompt, and our
 * connection appears in their list under X's name rather than ours.
 */
chrome.runtime.onMessage.addListener((message: WalletRequest, _sender, reply: Reply) => {
  if (!message?.type?.startsWith('wallet:')) return undefined

  handle(message)
    .then((data) => reply({ ok: true, data }))
    .catch((error) => reply({ ok: false, ...errorOf(error) }))

  // Keeps the channel open for the async reply above. Without it the panel gets
  // undefined the moment this listener returns.
  return true
})

/**
 * Let the panel keep a checkpoint in session storage.
 *
 * `chrome.storage.session` is hidden from content scripts by default. The panel
 * needs it because the alternative — the page's own `sessionStorage` — is
 * x.com's storage as much as ours, and the checkpoint holds a session
 * capability. Session storage is per-browser-session and never written to disk,
 * which is the right lifetime for a conversation.
 */
try {
  void chrome.storage.session.setAccessLevel({
    accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
  })
} catch {
  // An older Chrome without setAccessLevel simply leaves the panel without a
  // checkpoint; it degrades to losing the transcript on reload, not to breaking.
}

/**
 * Which tab is asking.
 *
 * A content script cannot see its own tab ID, and two X tabs must not share one
 * checkpoint. The sender knows, so the background answers.
 */
chrome.runtime.onMessage.addListener(
  (message: { type?: string }, sender, reply: (response: unknown) => void) => {
    if (message?.type !== 'tab:id') return undefined
    reply({ tabId: sender.tab?.id ?? null })
    return undefined
  }
)

/**
 * The panel's backend calls, made from here rather than from the content script.
 *
 * Chrome attributes a content script's fetch to the page's origin, so the panel
 * calling `http://localhost:8787` from x.com is a public site reaching into the
 * loopback address space. Chrome 153 refuses that outright — it is a permission
 * a *site* holds, and no header the server sends can grant it. A fetch from the
 * background is an extension request governed by `host_permissions` instead, and
 * is not address-space restricted.
 */
chrome.runtime.onMessage.addListener(
  (message: ApiRequest, _sender, reply: (response: unknown) => void) => {
    if (message?.type !== 'api:request') return undefined

    fetchForPanel(message)
      .then(reply)
      .catch((error) =>
        reply({ ok: false, status: 0, error: error instanceof Error ? error.message : 'Failed' })
      )

    return true
  }
)

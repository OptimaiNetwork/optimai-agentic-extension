import { statusOf } from '@x/libs/request-error'
import { catalystService } from '@x/services/catalyst'
import type {
  PortfolioChain,
  PortfolioTradeInput,
  PortfolioWallets,
  TradeSide,
} from '@x/services/catalyst'

/**
 * Old builds kept this queue in the page's own localStorage, where x.com's
 * scripts could read and rewrite it. It is never read again, only deleted.
 */
const LEGACY_STORAGE_KEY = 'catalyst-portfolio-recording-queue-v1'
export const PORTFOLIO_RECORDING_STORAGE_PREFIX = 'catalyst-portfolio-queue-v2:'

type QueueStatus = 'pending' | 'failed'

/**
 * What the Buy screen knew when it sent the swap, kept only to draw the row
 * while the trade confirms. Never sent: the server reads the fill from chain.
 */
export interface PortfolioTradePreview {
  side: TradeSide
  /** What the user typed: the stablecoin paid on a buy, the tokens on a sell. */
  amount: string
  asset: string
}

interface QueuedPortfolioTrade {
  chain: PortfolioChain
  wallet: string
  input: PortfolioTradeInput
  preview?: PortfolioTradePreview
  queued_at: number
  status?: QueueStatus
  attempts?: number
  last_attempt_at?: number
  next_attempt_at?: number
  last_error?: string
}

/** A trade on its way into the portfolio, as the History tab draws it. */
export interface QueuedPortfolioTradeView {
  chain: PortfolioChain
  transaction_id: string
  ticker: string
  venue: PortfolioTradeInput['venue']
  token_address: string
  status: QueueStatus
  preview?: PortfolioTradePreview
  last_error?: string
}

export interface PortfolioRecordingStatus {
  pending: number
  failed: number
  unsaved: boolean
  last_error?: string
  /** Newest first. */
  items: QueuedPortfolioTradeView[]
}

// The queue lives in `chrome.storage.local`, which belongs to this extension
// alone: wallet addresses, transaction ids and amounts must not sit where the
// host page's scripts can read or rewrite them. Reads stay synchronous because
// the UI polls them, so `queue` is a cache that `hydrate()` fills from storage
// and `chrome.storage.onChanged` keeps current across tabs. Where storage is
// unavailable or a write fails, the item stays in the cache, is flagged
// `unsaved`, and remains drainable for the lifetime of this panel.
const queue = new Map<string, QueuedPortfolioTrade>()
const unsavedKeys = new Set<string>()
let hydration: Promise<void> | null = null

const keyOf = (item: Pick<QueuedPortfolioTrade, 'chain' | 'input'>): string =>
  `${item.chain}:${item.input.transaction_id}`

const storageKeyFor = (key: string): string =>
  `${PORTFOLIO_RECORDING_STORAGE_PREFIX}${encodeURIComponent(key)}`

const itemKeyFromStorageKey = (storageKey: string): string =>
  decodeURIComponent(storageKey.slice(PORTFOLIO_RECORDING_STORAGE_PREFIX.length))

const isQueuedTrade = (value: unknown): value is QueuedPortfolioTrade => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<QueuedPortfolioTrade>
  const input = item.input as Partial<PortfolioTradeInput> | undefined
  return (
    (item.chain === 'bnb' || item.chain === 'solana') &&
    typeof item.wallet === 'string' &&
    typeof item.queued_at === 'number' &&
    Boolean(input) &&
    typeof input?.transaction_id === 'string' &&
    typeof input.venue === 'string' &&
    typeof input.ticker === 'string' &&
    typeof input.token_address === 'string' &&
    typeof input.quote_asset === 'string'
  )
}

const area = (): chrome.storage.StorageArea | null => {
  try {
    return chrome.storage?.local ?? null
  } catch {
    return null
  }
}

const notifyQueueChanged = (): void => {
  window.dispatchEvent(new CustomEvent('catalyst:portfolio-recording-updated'))
}

/** Delete what older builds left in the page's localStorage, unread. */
const purgeLegacyPageStorage = (): void => {
  try {
    const stale: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const name = window.localStorage.key(index)
      if (name === LEGACY_STORAGE_KEY || name?.startsWith(`${LEGACY_STORAGE_KEY}:`)) {
        stale.push(name)
      }
    }
    for (const name of stale) window.localStorage.removeItem(name)
  } catch {
    // The host page may disable localStorage; there is nothing to purge then.
  }
}

const onStorageChanged = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
): void => {
  if (areaName !== 'local') return
  let touched = false
  for (const [storageKey, change] of Object.entries(changes)) {
    if (!storageKey.startsWith(PORTFOLIO_RECORDING_STORAGE_PREFIX)) continue
    touched = true
    if (isQueuedTrade(change.newValue)) queue.set(keyOf(change.newValue), change.newValue)
    else queue.delete(itemKeyFromStorageKey(storageKey))
  }
  if (touched) notifyQueueChanged()
}

/** Load the persisted queue once; every reader of the cache waits on this. */
const hydrate = (): Promise<void> => {
  if (hydration) return hydration
  hydration = (async () => {
    purgeLegacyPageStorage()
    const storage = area()
    if (!storage) return
    try {
      const all = await storage.get(null)
      for (const [storageKey, value] of Object.entries(all)) {
        if (!storageKey.startsWith(PORTFOLIO_RECORDING_STORAGE_PREFIX)) continue
        if (!isQueuedTrade(value)) continue
        const itemKey = keyOf(value)
        // A copy still waiting to be written is newer than what storage holds.
        if (!unsavedKeys.has(itemKey)) queue.set(itemKey, value)
      }
      chrome.storage.onChanged?.addListener(onStorageChanged)
    } catch {
      // Unreadable storage leaves the in-memory queue as the only copy.
    }
    notifyQueueChanged()
  })()
  return hydration
}

const readQueue = (): QueuedPortfolioTrade[] => {
  void hydrate()
  return [...queue.values()]
}

const writeItem = async (item: QueuedPortfolioTrade, onlyIfAbsent: boolean): Promise<void> => {
  const itemKey = keyOf(item)
  const storage = area()
  if (!storage) {
    unsavedKeys.add(itemKey)
    return
  }
  try {
    const storageKey = storageKeyFor(itemKey)
    if (onlyIfAbsent) {
      const existing = await storage.get(storageKey)
      // Another tab queued the same transaction first; keep its retry state.
      if (isQueuedTrade(existing[storageKey])) {
        unsavedKeys.delete(itemKey)
        return
      }
    }
    await storage.set({ [storageKey]: item })
    unsavedKeys.delete(itemKey)
  } catch {
    unsavedKeys.add(itemKey)
  }
  notifyQueueChanged()
}

const persistItem = (item: QueuedPortfolioTrade, onlyIfAbsent = false): void => {
  queue.set(keyOf(item), item)
  notifyQueueChanged()
  void writeItem(item, onlyIfAbsent)
}

const removeItem = (itemKey: string): void => {
  queue.delete(itemKey)
  unsavedKeys.delete(itemKey)
  notifyQueueChanged()
  // Per-transaction keys mean a second tab can enqueue another trade without
  // this delete replacing or deleting its record.
  void area()
    ?.remove(storageKeyFor(itemKey))
    // If the delete fails the cache copy is already gone. A later retry stays
    // idempotent if a stale persistent copy becomes readable again.
    .catch(() => undefined)
}

const errorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error)
  return raw.trim() || 'Portfolio recording failed'
}

const isPendingFailure = (error: unknown): boolean => {
  const status = statusOf(error)
  return status === 409 && /pending|confirm|available|not .*yet/i.test(errorMessage(error))
}

const isPermanentFailure = (error: unknown): boolean => {
  const status = statusOf(error)
  // Invalid payloads, conflicts and other 4xx responses will not become valid
  // by retrying. Rate limits and timeouts are deliberately transient. A 409
  // is transient only when the backend explicitly says the transaction is
  // still pending confirmation.
  return (
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429 &&
    (status !== 409 || !isPendingFailure(error))
  )
}

const nextAttemptAt = (attempts: number): number =>
  Date.now() + Math.min(5 * 60_000, 2 ** attempts * 1_000)

const pendingUpdate = (item: QueuedPortfolioTrade, message: string): QueuedPortfolioTrade => {
  const attempts = (item.attempts ?? 0) + 1
  return {
    ...item,
    status: 'pending',
    attempts,
    last_attempt_at: Date.now(),
    next_attempt_at: nextAttemptAt(attempts),
    last_error: message,
  }
}

const failureUpdate = (item: QueuedPortfolioTrade, error: unknown): QueuedPortfolioTrade => {
  const attempts = (item.attempts ?? 0) + 1
  return {
    ...item,
    status: 'failed',
    attempts,
    last_attempt_at: Date.now(),
    next_attempt_at: nextAttemptAt(attempts),
    last_error: errorMessage(error),
  }
}

let drainInFlight: Promise<void> | null = null

/** Add one immutable fill to the extension's retry queue. Duplicate tx IDs are safe. */
export const enqueuePortfolioTrade = (
  chain: PortfolioChain,
  wallet: string,
  input: PortfolioTradeInput,
  preview?: PortfolioTradePreview
): void => {
  const next: QueuedPortfolioTrade = {
    chain,
    wallet,
    input,
    preview,
    queued_at: Date.now(),
    status: 'pending',
  }
  if (readQueue().some((item) => keyOf(item) === keyOf(next))) return
  persistItem(next, true)
}

/** Drain without blocking the Buy screen or dropping a confirmed transaction. */
const drainQueue = async (): Promise<void> => {
  await hydrate()
  const now = Date.now()
  const queue = readQueue().filter((item) => !item.next_attempt_at || item.next_attempt_at <= now)
  for (const item of queue) {
    const itemKey = keyOf(item)
    try {
      if (item.chain === 'bnb') {
        const receipt = await catalystService.tradeReceipt(item.input.transaction_id, {
          chain: 'bnb',
          venue: item.input.venue,
        })
        if (receipt.data.status === 'reverted') {
          // A reverted swap moved nothing, so there is no trade to record. The
          // Buy screen already said it failed; keeping it here only held the
          // Portfolio sync banner up for good.
          removeItem(itemKey)
          continue
        }
        if (receipt.data.status === 'pending') {
          persistItem(pendingUpdate(item, 'Transaction is still confirming'))
          continue
        }
      }
      await catalystService.recordPortfolioTrade(item.chain, item.wallet, item.input)
      removeItem(itemKey)
      window.dispatchEvent(
        new CustomEvent('catalyst:portfolio-recorded', {
          detail: { chain: item.chain, wallet: item.wallet },
        })
      )
    } catch (error) {
      if (isPermanentFailure(error)) {
        // The backend refused this trade outright (not a swap it can verify,
        // wrong venue, recorded for another wallet). Asking again gets the
        // same answer, so drop it rather than keep a banner nobody can clear.
        removeItem(itemKey)
        continue
      }
      persistItem(
        isPendingFailure(error)
          ? pendingUpdate(item, errorMessage(error))
          : failureUpdate(item, error)
      )
    }
  }
}

/** Whether a queued trade belongs to one of the wallets a portfolio covers. */
const belongsTo = (item: QueuedPortfolioTrade, wallets: PortfolioWallets): boolean =>
  wallets[item.chain] === item.wallet

export const getPortfolioRecordingStatus = (
  wallets: PortfolioWallets
): PortfolioRecordingStatus => {
  const items = readQueue()
    .filter((item) => belongsTo(item, wallets))
    .sort((a, b) => b.queued_at - a.queued_at)
  const failed = items.filter((item) => item.status === 'failed')
  const lastError = items.find((item) => item.last_error)?.last_error
  return {
    pending: items.filter((item) => item.status !== 'failed').length,
    failed: failed.length,
    unsaved: items.some((item) => unsavedKeys.has(keyOf(item))),
    last_error: lastError,
    items: items.map((item) => ({
      chain: item.chain,
      transaction_id: item.input.transaction_id,
      ticker: item.input.ticker,
      venue: item.input.venue,
      token_address: item.input.token_address,
      status: item.status === 'failed' ? 'failed' : 'pending',
      preview: item.preview,
      last_error: item.last_error,
    })),
  }
}

/** Make an explicit user retry skip the backoff and run on the next drain. */
export const retryPortfolioTradeQueue = (wallets: PortfolioWallets): Promise<void> => {
  for (const item of readQueue()) {
    if (!belongsTo(item, wallets)) continue
    persistItem({
      ...item,
      status: 'pending',
      next_attempt_at: undefined,
      last_error: undefined,
    })
  }
  return drainPortfolioTradeQueue()
}

/** Keep one drain active so the interval cannot race its own storage merge. */
export const drainPortfolioTradeQueue = (): Promise<void> => {
  if (!drainInFlight) {
    drainInFlight = drainQueue().finally(() => {
      drainInFlight = null
    })
  }
  return drainInFlight
}

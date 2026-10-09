/**
 * The retry queue holds wallet addresses and transaction ids, so it has to
 * live where x.com's scripts cannot reach: `chrome.storage.local`, never the
 * page's localStorage.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, unknown>()
type Listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void
let listeners: Listener[] = []

const input = (id: string) => ({
  transaction_id: id,
  venue: 'ondo' as const,
  ticker: 'NVDA',
  token_address: 'TokenAddr1',
  quote_asset: 'USDC',
})

const load = async () => import('./recording')
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  store.clear()
  listeners = []
  window.localStorage.clear()
  vi.resetModules()
  ;(globalThis as Record<string, unknown>).chrome = {
    storage: {
      local: {
        get: async (key: string | null) =>
          key === null ? Object.fromEntries(store) : { [key]: store.get(key) },
        set: async (entry: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(entry)) store.set(k, v)
        },
        remove: async (key: string) => {
          store.delete(key)
        },
      },
      onChanged: { addListener: (l: Listener) => listeners.push(l) },
    },
  }
})

describe('portfolio recording queue', () => {
  it('stores queued trades in chrome.storage.local and never in page localStorage', async () => {
    const { enqueuePortfolioTrade, getPortfolioRecordingStatus } = await load()
    enqueuePortfolioTrade('solana', 'WalletA', input('tx1'))
    await settle()

    expect([...store.keys()]).toEqual(['catalyst-portfolio-queue-v2:solana%3Atx1'])
    expect(window.localStorage.length).toBe(0)
    const status = getPortfolioRecordingStatus({ solana: 'WalletA' })
    expect(status.pending).toBe(1)
    expect(status.unsaved).toBe(false)
  })

  it('deletes and ignores entries an older build left in page localStorage', async () => {
    window.localStorage.setItem(
      'catalyst-portfolio-recording-queue-v1',
      JSON.stringify([{ chain: 'solana', wallet: 'WalletA', queued_at: 1, input: input('old') }])
    )
    window.localStorage.setItem('catalyst-portfolio-recording-queue-v1:solana%3Aold', '{}')
    window.localStorage.setItem('unrelated', 'keep')
    const { getPortfolioRecordingStatus } = await load()
    getPortfolioRecordingStatus({ solana: 'WalletA' })
    await settle()

    expect(window.localStorage.getItem('catalyst-portfolio-recording-queue-v1')).toBeNull()
    expect(
      window.localStorage.getItem('catalyst-portfolio-recording-queue-v1:solana%3Aold')
    ).toBeNull()
    expect(window.localStorage.getItem('unrelated')).toBe('keep')
    expect(getPortfolioRecordingStatus({ solana: 'WalletA' }).pending).toBe(0)
  })

  it('loads persisted items and skips malformed ones', async () => {
    store.set('catalyst-portfolio-queue-v2:solana%3Atx2', {
      chain: 'solana',
      wallet: 'WalletA',
      queued_at: 5,
      input: input('tx2'),
    })
    store.set('catalyst-portfolio-queue-v2:solana%3Abad', { chain: 'solana' })
    const { getPortfolioRecordingStatus } = await load()
    getPortfolioRecordingStatus({ solana: 'WalletA' })
    await settle()

    const status = getPortfolioRecordingStatus({ solana: 'WalletA' })
    expect(status.items.map((item) => item.transaction_id)).toEqual(['tx2'])
  })

  it('does not overwrite an item another tab already queued', async () => {
    const existing = {
      chain: 'solana',
      wallet: 'WalletA',
      queued_at: 5,
      attempts: 3,
      input: input('tx3'),
    }
    store.set('catalyst-portfolio-queue-v2:solana%3Atx3', existing)
    const { enqueuePortfolioTrade } = await load()
    enqueuePortfolioTrade('solana', 'WalletA', input('tx3'))
    await settle()

    expect(store.get('catalyst-portfolio-queue-v2:solana%3Atx3')).toEqual(existing)
  })

  it('follows changes made by another tab', async () => {
    const { getPortfolioRecordingStatus } = await load()
    getPortfolioRecordingStatus({ solana: 'WalletA' })
    await settle()
    const item = { chain: 'solana', wallet: 'WalletA', queued_at: 9, input: input('tx4') }
    const key = 'catalyst-portfolio-queue-v2:solana%3Atx4'

    listeners.forEach((l) => l({ [key]: { newValue: item } }, 'local'))
    expect(getPortfolioRecordingStatus({ solana: 'WalletA' }).pending).toBe(1)

    listeners.forEach((l) => l({ [key]: { oldValue: item } }, 'local'))
    expect(getPortfolioRecordingStatus({ solana: 'WalletA' }).pending).toBe(0)
  })

  it('keeps the trade in memory and flags it unsaved when storage is unavailable', async () => {
    delete (globalThis as { chrome?: unknown }).chrome
    ;(globalThis as Record<string, unknown>).chrome = {}
    const { enqueuePortfolioTrade, getPortfolioRecordingStatus } = await load()
    enqueuePortfolioTrade('solana', 'WalletA', input('tx5'))
    await settle()

    const status = getPortfolioRecordingStatus({ solana: 'WalletA' })
    expect(status.pending).toBe(1)
    expect(status.unsaved).toBe(true)
  })
})

import { beforeEach, describe, expect, test, vi } from 'vitest'

const service = vi.hoisted(() => ({
  lexicon: vi.fn(),
  lexiconVersion: vi.fn(),
}))

vi.mock('../services', () => ({ pageService: service }))

const { loadLexicon, LEXICON_STORAGE_KEY } = await import('./store')

const payload = (version: string) => ({
  version,
  generated_at: '2026-09-23T00:00:00Z',
  terms: [{ term: 'TSLA', ticker: 'TSLA', kind: 'ticker', case: 'exact', needs_context: false }],
  tokens: {
    TSLA: [{ chain: 'bnb', venue: 'bstock', symbol: 'TSLAB', address: '0x', quotable: true }],
  },
  names: {},
})

const MINUTE = 60_000
const HOUR = 60 * MINUTE
let store: Record<string, unknown>

beforeEach(() => {
  store = {}
  service.lexicon.mockReset()
  service.lexiconVersion.mockReset()
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
        set: vi.fn(async (items: Record<string, unknown>) => Object.assign(store, items)),
      },
    },
  })
})

const stored = (version: string, savedAgo: number, checkedAgo = savedAgo, now = Date.now()) => {
  store[LEXICON_STORAGE_KEY] = {
    savedAt: now - savedAgo,
    checkedAt: now - checkedAgo,
    lexicon: payload(version),
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('where the page gets its lexicon', () => {
  test('a fresh stored copy is used without asking the server', async () => {
    stored('v1', 5 * MINUTE)

    const lexicon = await loadLexicon()

    expect(lexicon?.version).toBe('v1')
    expect(service.lexicon).not.toHaveBeenCalled()
    expect(service.lexiconVersion).not.toHaveBeenCalled()
  })

  test('an older copy is used at once and checked behind the page', async () => {
    stored('v1', HOUR)
    service.lexiconVersion.mockResolvedValue({ data: { version: 'v2' } })
    service.lexicon.mockResolvedValue({ data: payload('v2') })

    const lexicon = await loadLexicon()
    await settle()
    await settle()

    expect(lexicon?.version).toBe('v1')
    expect(service.lexicon).toHaveBeenCalledOnce()
    expect((store[LEXICON_STORAGE_KEY] as { lexicon: { version: string } }).lexicon.version).toBe(
      'v2'
    )
  })

  test('an unchanged server only moves the check time', async () => {
    stored('v1', HOUR)
    service.lexiconVersion.mockResolvedValue({ data: { version: 'v1' } })

    await loadLexicon()
    await settle()

    expect(service.lexicon).not.toHaveBeenCalled()
  })

  test('a copy past six hours is replaced before the page is scanned', async () => {
    stored('v1', 7 * HOUR)
    service.lexicon.mockResolvedValue({ data: payload('v3') })

    expect((await loadLexicon())?.version).toBe('v3')
  })

  test('an unreachable server falls back to whatever is stored, however old', async () => {
    stored('v1', 30 * HOUR)
    service.lexicon.mockRejectedValue(new Error('offline'))

    expect((await loadLexicon())?.version).toBe('v1')
  })

  test('nothing stored and nothing reachable is no lexicon, not an error', async () => {
    service.lexicon.mockRejectedValue(new Error('offline'))

    await expect(loadLexicon()).resolves.toBeNull()
  })

  test('a malformed server answer is not stored', async () => {
    service.lexicon.mockResolvedValue({ data: { version: 'v9', terms: 'nope', tokens: {} } })

    await expect(loadLexicon()).resolves.toBeNull()
    expect(store[LEXICON_STORAGE_KEY]).toBeUndefined()
  })
})

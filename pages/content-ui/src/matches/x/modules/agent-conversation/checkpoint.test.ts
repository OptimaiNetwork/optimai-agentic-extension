/**
 * A reload has to give the cards back.
 *
 * The checkpoint is the only thing between a completed answer and a blank
 * panel after a refresh, and it is read by builds that did not write it — so
 * v1 has to migrate and a version from the future has to be refused rather
 * than guessed at.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, unknown>()

beforeEach(() => {
  store.clear()
  vi.resetModules()
  ;(globalThis as Record<string, unknown>).chrome = {
    runtime: { sendMessage: async () => ({ tabId: 7 }) },
    storage: {
      session: {
        get: async (key: string) => ({ [key]: store.get(key) }),
        set: async (entry: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(entry)) store.set(key, value)
        },
      },
    },
  }
})

const KEY = 'catalyst:agent:7'

const cardPart = {
  kind: 'card',
  id: 'card-1',
  card: {
    version: 1,
    kind: 'search-results',
    title: 'TSLA on X',
    subject: { ticker: 'TSLA' },
    observedAt: '2026-09-22T10:00:00Z',
    status: 'complete',
    sourceToolCallIds: [],
    sourceIds: [],
    limitations: [],
    evidenceId: 'ev_1',
    query: 'TSLA',
    mode: 'latest',
    window: {},
    sample: { collected: 1, deduplicated: 1, relevant: 1, classified: 0, authors: 1 },
    posts: [],
  },
}

const message = (overrides: Record<string, unknown> = {}) => ({
  id: 'run_1_answer',
  role: 'assistant',
  text: 'Mostly bullish.',
  at: 1,
  status: 'complete',
  ...overrides,
})

describe('checkpoint v2', () => {
  it('gives the cards back after a reload', async () => {
    const { restoreCheckpoint } = await import('./checkpoint')
    const { getAgentConversationSnapshot, __resetConversationStore } = await import('./index')
    __resetConversationStore()

    store.set(KEY, {
      version: 2,
      savedAt: Date.now(),
      conversationId: 'conv_1',
      capability: 'cap',
      messages: [message({ parts: [cardPart] })],
      draft: '',
      assets: [],
      runId: null,
      evidence: [],
    })

    await restoreCheckpoint()
    const [restored] = getAgentConversationSnapshot().messages
    expect(restored.parts).toHaveLength(1)
    expect(restored.parts?.[0]).toMatchObject({ kind: 'card', id: 'card-1' })
  })

  it('migrates a v1 checkpoint, which had text and no parts', async () => {
    const { restoreCheckpoint } = await import('./checkpoint')
    const { getAgentConversationSnapshot, __resetConversationStore } = await import('./index')
    __resetConversationStore()

    store.set(KEY, {
      version: 1,
      savedAt: Date.now(),
      conversationId: 'conv_1',
      capability: 'cap',
      messages: [message()],
      draft: 'half typed',
      assets: [],
      runId: null,
      evidence: [],
    })

    await restoreCheckpoint()
    const state = getAgentConversationSnapshot()
    expect(state.messages[0].text).toBe('Mostly bullish.')
    expect(state.messages[0].parts).toBeUndefined()
    expect(state.draft).toBe('half typed')
  })

  it('refuses a version it does not know rather than guessing', async () => {
    const { restoreCheckpoint } = await import('./checkpoint')
    const { getAgentConversationSnapshot, __resetConversationStore } = await import('./index')
    __resetConversationStore()

    store.set(KEY, { version: 99, messages: [message()] })
    await restoreCheckpoint()
    expect(getAgentConversationSnapshot().messages).toHaveLength(0)
  })

  it('drops a part that is not a part instead of restoring nothing', async () => {
    const { restoreCheckpoint } = await import('./checkpoint')
    const { getAgentConversationSnapshot, __resetConversationStore } = await import('./index')
    __resetConversationStore()

    store.set(KEY, {
      version: 2,
      conversationId: 'conv_1',
      capability: 'cap',
      messages: [message({ parts: [cardPart, 'nonsense', null] })],
      draft: '',
      assets: [],
      runId: null,
      evidence: [],
    })

    await restoreCheckpoint()
    expect(getAgentConversationSnapshot().messages[0].parts).toHaveLength(1)
  })

  it('marks an interrupted run rather than resuming it', async () => {
    // Re-running somebody's browser navigation because a tab reloaded is worse
    // than showing them a Retry.
    const { restoreCheckpoint } = await import('./checkpoint')
    const { getAgentConversationSnapshot, __resetConversationStore } = await import('./index')
    __resetConversationStore()

    store.set(KEY, {
      version: 2,
      conversationId: 'conv_1',
      capability: 'cap',
      messages: [message({ status: 'pending' })],
      draft: '',
      assets: [],
      runId: 'run_1',
      evidence: [],
    })

    await restoreCheckpoint()
    const state = getAgentConversationSnapshot()
    expect(state.recovery).toBe('interrupted')
    expect(state.runId).toBeNull()
    expect(state.runState).toBe('idle')
  })
})

it('revalidates corrupt visual payloads and terminates pending telemetry on reload', async () => {
  const { restoreCheckpoint } = await import('./checkpoint')
  const { getAgentConversationSnapshot, __resetConversationStore } = await import('./index')
  __resetConversationStore()
  store.set(KEY, {
    version: 2,
    messages: [
      message({
        status: 'pending',
        parts: [
          { kind: 'visualization', id: 'bad', spec: { type: 'flow', nodes: null } },
          {
            kind: 'activity',
            id: 'live',
            activity: {
              version: 1,
              runId: 'r',
              status: 'running',
              steps: [
                {
                  id: 'call',
                  code: 'search_x',
                  status: 'running',
                  startedAt: '2026-09-22T10:00:00Z',
                },
              ],
            },
          },
        ],
      }),
    ],
  })
  await restoreCheckpoint()
  const restored = getAgentConversationSnapshot().messages[0]
  expect(restored.status).toBe('interrupted')
  expect(restored.parts?.[0].kind).toBe('unsupported')
  const activity = restored.parts?.[1]
  expect(activity?.kind).toBe('activity')
  if (activity?.kind === 'activity') expect(activity.activity.steps[0].status).toBe('interrupted')
})

describe('a corrupt checkpoint costs the transcript, never the panel', () => {
  /**
   * Found by review: `migrate` spread every field except `messages` straight
   * out of storage. `assets` is indexed unguarded while rendering
   * (`asset.ticker` in the agent page), and there is no error boundary above
   * that page — so one null in the stored array threw during render and the
   * whole panel went blank after a reload. That is strictly worse than the
   * bad-card bug this file was written to prevent.
   */
  it('drops an asset that would throw while rendering', async () => {
    store.set(KEY, {
      version: 2,
      savedAt: Date.now(),
      conversationId: 'c1',
      capability: 'cap',
      messages: [],
      draft: '',
      assets: [null, { ticker: 'TSLA' }, { symbol: 'no ticker' }],
      evidence: [],
      runId: null,
    })
    const { restoreCheckpoint } = await import('./checkpoint')
    const { getAgentConversationSnapshot } = await import('./index')
    await restoreCheckpoint()

    const assets = getAgentConversationSnapshot().assets
    expect(assets).toEqual([{ ticker: 'TSLA' }])
    // The render expression the panel actually uses must not throw.
    expect(() => assets.map((asset) => asset.ticker).join(',')).not.toThrow()
  })

  it('refuses evidence hints that are not hints', async () => {
    store.set(KEY, {
      version: 2,
      savedAt: Date.now(),
      conversationId: 'c1',
      capability: 'cap',
      messages: [],
      draft: '',
      assets: [],
      evidence: [{ evidence_id: 'ev_1', query: 'q' }, 'nonsense', null],
      runId: null,
    })
    const { restoreCheckpoint } = await import('./checkpoint')
    const { getAgentConversationSnapshot } = await import('./index')
    await restoreCheckpoint()
    expect(getAgentConversationSnapshot().evidence).toHaveLength(1)
  })

  it('does not take a draft, capability or id that is not a string', async () => {
    store.set(KEY, {
      version: 2,
      savedAt: 'whenever',
      conversationId: 42,
      capability: { nope: true },
      messages: [],
      draft: ['not', 'a', 'draft'],
      assets: [],
      evidence: [],
      runId: null,
    })
    const { restoreCheckpoint } = await import('./checkpoint')
    const { getAgentConversationSnapshot } = await import('./index')
    await restoreCheckpoint()

    const state = getAgentConversationSnapshot()
    expect(state.conversationId).toBeNull()
    expect(state.capability).toBeNull()
    expect(state.draft).toBe('')
  })

  /**
   * Found by review: the trim notice was appended unconditionally, and a
   * restored checkpoint's limitations load verbatim back into live state — so
   * every over-budget write after a reload stacked another copy of the same
   * sentence, each with the same React key.
   */
  it('does not stack the trim notice on every over-budget write', async () => {
    const huge = 'x'.repeat(3 * 1024 * 1024)
    store.set(KEY, {
      version: 2,
      savedAt: Date.now(),
      conversationId: 'c1',
      capability: 'cap',
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          text: huge,
          status: 'complete',
          limitations: ['Older visuals were omitted to fit saved history.'],
        },
      ],
      draft: '',
      assets: [],
      evidence: [],
      runId: null,
    })
    const { restoreCheckpoint, startCheckpointing } = await import('./checkpoint')
    const { getAgentConversationSnapshot, updateAgentConversation } = await import('./index')
    await restoreCheckpoint()

    // Two over-budget writes through the real debounced path, which is what a
    // reload followed by any further edit actually does.
    const stop = startCheckpointing()
    for (let round = 0; round < 2; round += 1) {
      updateAgentConversation({ draft: `round ${round}` })
      await new Promise((resolve) => setTimeout(resolve, 450))
    }
    stop()

    const stored = store.get(KEY) as { messages: { limitations?: string[] }[] }
    const notices = (stored.messages[0].limitations ?? []).filter((note) =>
      note.includes('Older visuals were omitted')
    )
    expect(notices).toHaveLength(1)
    expect(getAgentConversationSnapshot().messages).toHaveLength(1)
  })

  /**
   * Found by review: an already-unsupported part was sent back through
   * `parsePart` as `type: 'unsupported'`, losing the original type — and the
   * bubble only shows its "unavailable" notice for a part still calling itself
   * `data-visualization` or `data-research-card`. The placeholder vanished on
   * every reload with nothing in its place.
   */
  it('keeps what an unsupported part originally was', async () => {
    store.set(KEY, {
      version: 2,
      savedAt: Date.now(),
      conversationId: 'c1',
      capability: 'cap',
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          text: 'answer',
          status: 'complete',
          parts: [{ kind: 'unsupported', id: 'p1', type: 'data-visualization' }],
        },
      ],
      draft: '',
      assets: [],
      evidence: [],
      runId: null,
    })
    const { restoreCheckpoint } = await import('./checkpoint')
    const { getAgentConversationSnapshot } = await import('./index')
    await restoreCheckpoint()

    const part = getAgentConversationSnapshot().messages[0].parts?.[0]
    expect(part?.kind).toBe('unsupported')
    if (part?.kind === 'unsupported') expect(part.type).toBe('data-visualization')
  })
})

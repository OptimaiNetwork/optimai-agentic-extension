import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const quote = vi.fn(async (_ticker: string) => ({
  data: { symbol: 'NVDAB', reference_price: '222' },
}))
vi.mock('@x/services/catalyst', () => ({ catalystService: { quote: (t: string) => quote(t) } }))

const { useQuote } = await import('./use-quote')

const render = (active: boolean) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Host = () => {
    useQuote('NVDA', { active })
    return null
  }
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => {
    root.render(createElement(QueryClientProvider, { client }, createElement(Host)))
  })
  return () =>
    act(() => {
      root.unmount()
      client.clear()
    })
}

describe('not polling for a panel nobody can see', () => {
  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    quote.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('keeps the price fresh while the panel is open', async () => {
    // Arrange — the token trades around the clock, so an open panel showing a
    // stale number is the thing this interval exists to prevent.
    const teardown = render(true)

    // Act — a minute and a half. Async, because the interval only starts once
    // the first fetch settles, and that settles on a microtask.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(95_000)
    })

    // Assert — the first fetch plus three intervals.
    expect(quote.mock.calls.length).toBeGreaterThan(1)
    teardown()
  })

  it('fetches once and then stops when the panel is shut', async () => {
    // Arrange — the panel is never unmounted, so this route is still alive
    // behind it with its data already on screen for whenever it reopens.
    const teardown = render(false)

    // Act
    await act(async () => {
      await vi.advanceTimersByTimeAsync(95_000)
    })

    // Assert — one fetch, not four. Before this the closed panel asked for a
    // fresh price every thirty seconds for the life of the tab.
    expect(quote).toHaveBeenCalledTimes(1)
    teardown()
  })
})

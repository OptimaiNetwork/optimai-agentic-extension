import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTweetInjection } from './use-tweet-injection'
import type { SupportedTickers } from '@x/queries/catalyst/use-supported-tickers'

// The button itself is not what is under test — the bookkeeping around its React
// root is. A stub keeps the test off the query client and the router.
vi.mock('./tweet-button', () => ({
  TweetButton: ({ tickers }: { tickers: string[] }) =>
    createElement('span', { 'data-stub': tickers.join(',') }, tickers.join(',')),
}))

const supported: SupportedTickers = { names: new Set(['NVDA']), aliases: new Map(), tokens: [] }

const tweet = (id: string) => `
  <article data-testid="tweet">
    <a href="/someone/status/${id}"><time datetime="2026-09-19T00:00:00Z">now</time></a>
    <div data-testid="tweetText">
      <a href="/search?q=%24NVDA&src=cashtag_click">$NVDA</a>
    </div>
    <div role="group"><button data-testid="reply">reply</button></div>
  </article>`

const Host = () => {
  useTweetInjection(supported)
  return null
}

const mountsIn = (root: ParentNode) =>
  Array.from(root.querySelectorAll('.catalyst-tweet-button-mount'))

describe('not leaking a React root for every row scrolled past', () => {
  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    document.body.innerHTML = `<div data-testid="primaryColumn">${tweet('1')}${tweet('2')}</div>`
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('tears down the root of a row X detached, not just the ones it can still see', () => {
    // Arrange — two rows on screen, each carrying a button.
    const host = document.createElement('div')
    const reactRoot = createRoot(host)
    act(() => {
      reactRoot.render(createElement(Host))
    })

    const column = document.querySelector('[data-testid="primaryColumn"]')!
    const articles = Array.from(column.querySelectorAll('article'))
    expect(mountsIn(column)).toHaveLength(2)

    // Hold the mount of the row about to go, because once detached it is
    // unreachable from the document — which is the whole problem.
    const leaving = articles[0].querySelector('.catalyst-tweet-button-mount')!
    expect(leaving.textContent).toBe('NVDA')

    // Act — scroll it away. X removes the row outright; it does not hide it.
    articles[0].remove()
    act(() => {
      vi.advanceTimersByTime(2_100)
    })

    // Assert — the sweep cannot see a detached row, so before the reap this
    // root stayed mounted, holding its fibre tree and its container, for the
    // life of the tab. One per row scrolled past, with no ceiling.
    expect(leaving.textContent).toBe('')
    expect(leaving.isConnected).toBe(false)
    expect(mountsIn(column)).toHaveLength(1)

    act(() => {
      reactRoot.unmount()
    })
  })

  it('leaves the rows that are still on screen alone', () => {
    const host = document.createElement('div')
    const reactRoot = createRoot(host)
    act(() => {
      reactRoot.render(createElement(Host))
    })

    const column = document.querySelector('[data-testid="primaryColumn"]')!
    act(() => {
      vi.advanceTimersByTime(6_000)
    })

    // Three sweeps later the buttons are the same ones, not rebuilt each pass.
    expect(mountsIn(column)).toHaveLength(2)
    expect(mountsIn(column).every((mount) => mount.textContent === 'NVDA')).toBe(true)

    act(() => {
      reactRoot.unmount()
    })
  })
})

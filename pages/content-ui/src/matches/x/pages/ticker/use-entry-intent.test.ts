import { getSelection, setSelection } from '@x/modules/venue'
import type { ChainId, VenueId } from '@x/modules/venue'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useEntryIntent } from './use-entry-intent'

// `setSelection` persists the issuer. Nothing here asserts on that, but without
// a stub the first call throws on `chrome.storage` and the hook never returns.
const stubChromeStorage = () => {
  ;(globalThis as { chrome?: unknown }).chrome = {
    storage: { local: { set: async () => undefined, get: async () => ({}) } },
  }
}

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
let ready: boolean | null = null

interface HostProps {
  cashtag: string
  intent: { venue?: VenueId; chain?: ChainId }
}

// Declared once, outside `render`, and that matters: a component defined inside
// the helper would be a new type on every call, so React would unmount and
// remount instead of re-rendering — and the hook's "already applied" state,
// which is the whole thing under test, would reset each time. The real page
// stays mounted across a navigation.
const Host = ({ cashtag, intent }: HostProps) => {
  ready = useEntryIntent(cashtag, intent)
  return null
}

const render = (cashtag: string, intent: { venue?: VenueId; chain?: ChainId }) => {
  act(() => {
    root.render(createElement(Host, { cashtag, intent }))
  })
}

beforeEach(() => {
  ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  stubChromeStorage()
  // The store is a module singleton, so each test starts from the default.
  setSelection('bstock')
  ready = null
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('useEntryIntent', () => {
  it('switches to the issuer the caller arrived with', () => {
    render('NVDA', { venue: 'ondo' })

    expect(getSelection()).toEqual({ venue: 'ondo', chain: 'solana' })
    expect(ready).toBe(true)
  })

  it('leaves the issuer alone when the caller named none', () => {
    render('NVDA', {})

    expect(getSelection().venue).toBe('bstock')
    // Nothing to wait for, so the page may load immediately.
    expect(ready).toBe(true)
  })

  it('does not undo a switch made while the page is open', () => {
    // The bug this hook exists for: the effect used to re-apply the entry
    // issuer whenever the selection drifted from it, so picking bStocks in the
    // switcher navigated to Market and then silently reverted to Ondo.
    render('NVDA', { venue: 'ondo' })
    expect(getSelection().venue).toBe('ondo')

    act(() => setSelection('bstock'))
    render('NVDA', { venue: 'ondo' })

    expect(getSelection().venue).toBe('bstock')
  })

  it('applies a second ticker opened from a different issuer', () => {
    render('NVDA', { venue: 'ondo' })
    expect(getSelection().venue).toBe('ondo')

    // A new intent, not the applied one: the user tapped a tweet button on a
    // post about a bStocks token while reading Ondo.
    render('TSLA', { venue: 'bstock' })

    expect(getSelection().venue).toBe('bstock')
    expect(ready).toBe(true)
  })

  it('reports not-ready on the first render, so nothing is fetched against the old issuer', () => {
    const seen: boolean[] = []
    const Watcher = () => {
      seen.push(useEntryIntent('NVDA', { venue: 'prestock' }))
      return null
    }
    act(() => {
      root.render(createElement(Watcher))
    })

    expect(seen[0]).toBe(false)
    expect(seen.at(-1)).toBe(true)
    expect(getSelection()).toEqual({ venue: 'prestock', chain: 'solana' })
  })
})

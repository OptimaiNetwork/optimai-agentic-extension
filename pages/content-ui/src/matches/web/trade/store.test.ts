import { beforeEach, describe, expect, test, vi } from 'vitest'

const setSelection = vi.hoisted(() => vi.fn())
vi.mock('@x/modules/venue', () => ({ setSelection }))

const { closeTradePanel, isUnderTradePanel, openTradePanel, switchTradeChain, useWebTrade } =
  await import('./store')
const { act, createElement } = await import('react')
const { createRoot } = await import('react-dom/client')

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

beforeEach(() => {
  setSelection.mockReset()
  closeTradePanel()
})

describe('opening the trade panel from a card', () => {
  test('moves the selection to the card’s listing before anything renders', () => {
    openTradePanel({ ticker: 'TSLA', chain: 'solana', venue: 'ondo', symbol: 'TSLAon' })

    expect(setSelection).toHaveBeenCalledWith('ondo', 'solana')
  })

  test('the open panel sees the intent, and a close clears it', () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    const seen: Array<string | null> = []
    const Probe = () => {
      seen.push(useWebTrade()?.ticker ?? null)
      return null
    }
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(createElement(Probe)))

    act(() => openTradePanel({ ticker: 'NVDA', chain: 'bnb', venue: 'bstock' }))
    act(() => closeTradePanel())

    expect(seen).toEqual([null, 'NVDA', null])
    act(() => root.unmount())
  })

  test('a second press on the same token starts fresh', () => {
    const first = vi.spyOn(Date, 'now').mockReturnValue(1)
    openTradePanel({ ticker: 'TSLA', chain: 'bnb', venue: 'bstock' })
    first.mockReturnValue(2)
    let opened: number | undefined
    const Probe = () => {
      opened = useWebTrade()?.openedAt
      return null
    }
    const root = createRoot(document.createElement('div'))
    act(() => root.render(createElement(Probe)))
    act(() => openTradePanel({ ticker: 'TSLA', chain: 'bnb', venue: 'bstock' }))

    expect(opened).toBe(2)
    act(() => root.unmount())
    first.mockRestore()
  })
})

describe('the screen and chain the panel shows', () => {
  const current = () => {
    let seen: ReturnType<typeof useWebTrade> = null
    const Probe = () => {
      seen = useWebTrade()
      return null
    }
    const root = createRoot(document.createElement('div'))
    act(() => root.render(createElement(Probe)))
    act(() => root.unmount())
    return seen as ReturnType<typeof useWebTrade>
  }

  test('moves the selection and reopens on the same screen', () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    openTradePanel({ ticker: 'META', chain: 'solana', venue: 'ondo', chains: ['solana', 'bnb'] })
    const before = current()
    setSelection.mockReset()

    act(() => switchTradeChain('bnb', 'token'))

    const after = current()
    expect(setSelection).toHaveBeenCalledWith('ondo', 'bnb')
    expect(after).toMatchObject({ ticker: 'META', chain: 'bnb', venue: 'ondo', screen: 'token' })
    expect(after?.openedAt).not.toBe(before?.openedAt)
  })

  test('ignores a chain the issuer does not list the ticker on', () => {
    openTradePanel({ ticker: 'NVDA', chain: 'bnb', venue: 'bstock', chains: ['bnb'] })
    setSelection.mockReset()

    act(() => switchTradeChain('solana', 'buy'))

    expect(setSelection).not.toHaveBeenCalled()
    expect(current()?.chain).toBe('bnb')
  })

  test('View token opens on the token page', () => {
    openTradePanel({ ticker: 'META', chain: 'solana', venue: 'ondo', screen: 'token' })

    expect(current()).toMatchObject({ ticker: 'META', screen: 'token' })
  })

  test('a fresh Trade opens on the order form', () => {
    openTradePanel({ ticker: 'META', chain: 'solana', venue: 'ondo', chains: ['solana', 'bnb'] })
    act(() => switchTradeChain('bnb', 'token'))

    openTradePanel({ ticker: 'TSLA', chain: 'solana', venue: 'ondo' })

    expect(current()).toMatchObject({ ticker: 'TSLA', screen: 'buy', chains: ['solana'] })
  })
})

describe('what the open panel covers', () => {
  test('the right-hand strip of the window, only while the panel is open', () => {
    const edge = window.innerWidth - Math.min(500, window.innerWidth)
    expect(isUnderTradePanel(window.innerWidth - 1)).toBe(false)

    openTradePanel({ ticker: 'NVDA', chain: 'bnb', venue: 'bstock' })

    expect(isUnderTradePanel(window.innerWidth - 1)).toBe(true)
    expect(isUnderTradePanel(edge)).toBe(true)
    if (edge > 0) expect(isUnderTradePanel(edge - 1)).toBe(false)
  })
})

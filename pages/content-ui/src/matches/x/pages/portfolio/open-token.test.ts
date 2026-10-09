import type { PortfolioPosition } from '@x/services/catalyst'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PositionList } from './position-list'

const MSFT: PortfolioPosition = {
  chain: 'solana',
  venue: 'ondo',
  ticker: 'MSFT',
  token_address: 'FRmH6iRkMr33DLG6zVLR7EM4LojBFAuq6NtFzG6ondo',
  quantity: '0.002352402',
  cost_basis: '1.2',
  average_entry_price: '510.1168932860965',
  current_price: '503.7717610195767',
  market_value: '1.185074',
  unrealized_pnl: '-0.014926',
  unrealized_pnl_percent: '-1.244',
  price_source: 'ondo',
  weight_percent: '100',
  logo: null,
}

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
let opened: { cashtag?: string; state: unknown } | null = null

const TokenProbe = () => {
  const { cashtag } = useParams()
  opened = { cashtag, state: useLocation().state }
  return null
}

beforeEach(() => {
  ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  opened = null
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/portfolio'] },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: '/portfolio',
            element: createElement(PositionList, { positions: [MSFT] }),
          }),
          createElement(Route, { path: '/token/:cashtag', element: createElement(TokenProbe) })
        )
      )
    )
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('a portfolio position', () => {
  it('opens its token on the issuer and chain it was bought on', () => {
    const row = container.querySelector<HTMLButtonElement>('[role="tabpanel"] li button')
    expect(row?.textContent).toContain('MSFT')

    act(() => row?.click())

    // Not whatever the header was on: the ticker page applies this once, and
    // its back arrow comes back here instead of to Market.
    expect(opened).toEqual({
      cashtag: 'MSFT',
      state: { venue: 'ondo', chain: 'solana', returnPath: '/portfolio' },
    })
  })
})

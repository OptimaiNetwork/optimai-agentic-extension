import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { TickerPopoverView, type TickerPopoverViewProps } from './popover-view'

// The chain badge draws an inline SVG mark; this test is about the card's structure.
vi.mock('@x/modules/wallet/marks', () => ({ NamespaceMark: () => null }))

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

let host: HTMLElement
let root: Root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const base: TickerPopoverViewProps = {
  symbol: 'NVDAB',
  subtitle: 'NVIDIA · bStocks · BNB Chain',
  logo: null,
  chain: 'bnb',
  dark: true,
  price: { value: '$222.05', change: '+0.41%', down: false },
  stats: [
    { label: '24h volume', value: '$6.8M' },
    { label: 'Holders', value: '9.7K' },
  ],
  status: 'Loading market data…',
  actions: [],
  onClose: () => undefined,
  onPointerEnter: () => undefined,
  onPointerLeave: () => undefined,
  style: {},
}

const render = (props: Partial<TickerPopoverViewProps>) =>
  act(() => root.render(createElement(TickerPopoverView, { ...base, ...props })))

const card = () => host.querySelector('.catalyst-tweet-market-popover') as HTMLElement

describe('the card as X draws it', () => {
  test('a heading that opens the panel, and Ask beside Trade', () => {
    const onHeadingClick = vi.fn()
    render({
      onHeadingClick,
      actions: [
        { name: 'ask', label: 'Ask about NVDAB' },
        { name: 'trade', label: 'Trade now', primary: true },
      ],
    })

    const heading = card().querySelector('button.catalyst-tweet-market-heading') as HTMLElement
    act(() => heading.click())
    expect(onHeadingClick).toHaveBeenCalledOnce()
    expect(card().className).toBe('catalyst-tweet-market-popover is-dark')
    expect(card().querySelector('.catalyst-tweet-market-actions')?.className).toBe(
      'catalyst-tweet-market-actions'
    )
    expect(card().querySelector('.is-trade')?.textContent).toBe('Trade now')
    expect(card().textContent).toContain('$222.05')
  })
})

describe('the card on any other site', () => {
  test('a chart under the price, one action, and a heading that is only a label', () => {
    render({
      dark: false,
      chart: createElement('div', { className: 'catalyst-ticker-popover-chart' }),
      actions: [{ name: 'trade', label: 'Trade now', primary: true }],
    })

    expect(card().className).toBe('catalyst-tweet-market-popover is-light has-chart')
    expect(card().querySelector('button.catalyst-tweet-market-heading')).toBeNull()
    expect(card().querySelector('.catalyst-tweet-market-heading.is-static')).not.toBeNull()
    expect(card().querySelectorAll('.catalyst-tweet-market-actions button')).toHaveLength(1)
    // Joined with a space: a formatter once trimmed it and the card went transparent.
    expect(card().querySelector('.catalyst-tweet-market-actions')?.className).toBe(
      'catalyst-tweet-market-actions is-single'
    )
    expect(card().querySelector('[data-action="ask"]')).toBeNull()
    const order = Array.from(card().children).map((child) => child.className)
    expect(order.indexOf('catalyst-ticker-popover-chart')).toBe(
      order.indexOf('catalyst-tweet-market-price-row') + 1
    )
  })

  test('without a price it says why instead of showing numbers', () => {
    render({ price: null, stats: null, status: 'Market details are unavailable right now.' })

    expect(card().querySelector('[role="status"]')?.textContent).toBe(
      'Market details are unavailable right now.'
    )
    expect(card().querySelector('.catalyst-tweet-market-stats')).toBeNull()
  })
})

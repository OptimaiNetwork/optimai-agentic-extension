import { beforeEach, describe, expect, it } from 'vitest'

import { anchorIn, cashtagOfSearch } from './anchor'
import { closedWindowOf } from './closed-window'
import type { Candle } from '@x/services/catalyst'

describe('deciding a page is about a ticker', () => {
  it('reads the cashtag out of the search query', () => {
    expect(cashtagOfSearch('https://x.com/search?q=%24NVDA&src=cashtag_click')).toBe('NVDA')
    expect(cashtagOfSearch('https://x.com/search?q=%24nvda&f=live')).toBe('NVDA')
  })

  it('ignores a search that is not for a cashtag', () => {
    // A plain text search shares the same path, and "nvidia earnings" is not a
    // ticker.
    expect(cashtagOfSearch('https://x.com/search?q=nvidia%20earnings')).toBeNull()
    expect(cashtagOfSearch('https://x.com/home')).toBeNull()
    expect(cashtagOfSearch('https://x.com/someone/status/1')).toBeNull()
  })

  it('takes only the first word of a longer query', () => {
    // People search `$NVDA earnings`, and the ticker is still NVDA.
    expect(cashtagOfSearch('https://x.com/search?q=%24NVDA%20earnings')).toBe('NVDA')
  })

  it('refuses something that cannot be a ticker', () => {
    expect(cashtagOfSearch('https://x.com/search?q=%24')).toBeNull()
    expect(cashtagOfSearch('https://x.com/search?q=%24not-a-ticker-at-all')).toBeNull()
  })
})

describe('finding where to put the card', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('goes after X’s own card, which is the cell holding no article', () => {
    // Arrange — X's price card has no data-testid of its own. What distinguishes
    // it from every other timeline cell is that it contains no article.
    document.body.innerHTML = `
      <div data-testid="primaryColumn">
        <div data-testid="cellInnerDiv" id="x-card"><div>NVIDIA Corp</div></div>
        <div data-testid="cellInnerDiv" id="first-tweet"><article>a post</article></div>
      </div>`

    // Act / Assert
    expect(anchorIn()?.id).toBe('x-card')
  })

  it('falls back to the top when X rendered no card', () => {
    // Arrange — X has no card for every ticker, and those are exactly the pages
    // where ours is the only thing there.
    document.body.innerHTML = `
      <div data-testid="primaryColumn">
        <div data-testid="cellInnerDiv" id="first-tweet"><article>a post</article></div>
      </div>`

    // Act / Assert
    expect(anchorIn()?.id).toBe('first-tweet')
  })

  it('returns nothing before the column exists', () => {
    expect(anchorIn()).toBeNull()
  })
})

const candle = (
  session: 'regular' | 'closed',
  low: number,
  high: number,
  close: number
): Candle => ({
  open_time: '2026-09-19T00:00:00Z',
  open: String(low),
  high: String(high),
  low: String(low),
  close: String(close),
  volume: '1000',
  session,
})

describe('measuring what happened while the exchange was shut', () => {
  it('reports the range and the net move, not one or the other', () => {
    // Arrange — the net move is usually small and the range usually is not.
    const candles = [
      candle('regular', 100, 101, 100),
      candle('closed', 98, 104, 99),
      candle('closed', 97, 103, 100),
    ]

    // Act
    const window = closedWindowOf(candles)

    // Assert — quoting only the range overstates it; quoting only the net hides
    // that anything happened.
    expect(window).toMatchObject({ hours: 2, low: 97, high: 104 })
    expect(window?.rangePercent).toBeCloseTo(7.22, 1)
    expect(window?.netPercent).toBeCloseTo(2.04, 1)
  })

  it('measures only the most recent shut stretch', () => {
    // Arrange — last week's weekend is not the line X is drawing flat right now.
    const candles = [
      candle('closed', 50, 60, 55),
      candle('closed', 50, 60, 55),
      candle('regular', 100, 101, 100),
      candle('closed', 99, 102, 101),
      candle('closed', 99, 102, 101),
    ]

    // Act
    const window = closedWindowOf(candles)

    // Assert — stitching both runs together would make the number bigger and the
    // claim false.
    expect(window).toMatchObject({ hours: 2, low: 99, high: 102 })
  })

  it('says nothing when the market has been open throughout', () => {
    expect(closedWindowOf([candle('regular', 100, 101, 100)])).toBeNull()
  })
})

describe('refusing to measure a window it cannot see the start of', () => {
  it('says nothing while the market is open', () => {
    // Arrange — mid-session, the most recent closed run is last night's.
    const candles = [
      candle('closed', 99, 102, 101),
      candle('closed', 99, 102, 101),
      candle('regular', 100, 101, 100),
    ]

    // Act / Assert — reporting it put "the US market has been shut for 18 hours"
    // beside X's own card ticking live.
    expect(closedWindowOf(candles)).toBeNull()
  })

  it('says nothing when the closure began before the window', () => {
    // Arrange — every candle closed, so the run reaches the first one and its
    // real length and opening price are both unknowable.
    const candles = [candle('closed', 99, 102, 101), candle('closed', 99, 103, 102)]

    // Act / Assert — "shut for 48 hours" when it has been 65, priced from the
    // wrong moment, is worse than silence. The card asks for 96 candles so this
    // does not happen over a normal weekend.
    expect(closedWindowOf(candles)).toBeNull()
  })
})

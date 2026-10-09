import type { VisualizationSpec } from '@extension/shared'
import { describe, expect, it } from 'vitest'

import { compactUsd, listingFor, pct, quantity, routeFor, usd } from './card-kit'
import { chainOf } from './flow-renderer'
import { onYourClock, sessionOf, sessionTip } from './market-card-body'
import { cadence, intervalName, spanLabel } from './price-chart-body'
import { stanceHeadline } from './stance-tally'
import { beamTilt, disclaimerText, leanHeadline, sideCaption } from './trade-analysis-body'

describe('figures', () => {
  it('formats prices, scale figures and quantities the way the cards print them', () => {
    expect(usd('213.8')).toBe('$213.80')
    expect(compactUsd('3810000')).toBe('$3.81M')
    expect(compactUsd('412800')).toBe('$412.8K')
    expect(quantity('0.0933852')).toBe('0.093385')
  })

  it('never prints a dash: a missing figure is N/A and a percentage carries no sign', () => {
    expect(usd(null)).toBe('N/A')
    expect(compactUsd(undefined)).toBe('N/A')
    expect(pct(-2.18)).toBe('2.18%')
  })
})

describe('venues', () => {
  it('maps a card venue key onto its issuer, chain and route', () => {
    expect(listingFor('ondo_solana')).toEqual({ venue: 'ondo', chain: 'solana' })
    expect(listingFor('bstock')).toEqual({ venue: 'bstock', chain: 'bnb' })
    expect(routeFor('ondo_solana')).toBe('Jupiter RFQ')
    expect(routeFor('ondo_bnb')).toBe('PancakeSwap')
    expect(listingFor('somewhere')).toBeUndefined()
  })

  it('reads the exchange session the way the header chip names it', () => {
    expect(sessionOf('regular')).toBe('open')
    expect(sessionOf('pre_market')).toBe('pre')
    expect(sessionOf('after_hours')).toBe('after')
    expect(sessionOf('closed')).toBe('closed')
    expect(sessionOf(null)).toBeUndefined()
  })
})

describe('chart window', () => {
  const hour = (h: number) => new Date(Date.UTC(2026, 8, 24, h)).toISOString()

  it('counts the last candle, so 24 hourly candles span 24 hours', () => {
    expect(spanLabel(hour(0), hour(23), '1h')).toBe('24h')
    expect(spanLabel(hour(0), hour(23))).toBe('23h')
  })

  it('names the interval in words', () => {
    expect(intervalName('1h')).toBe('1 hour')
    expect(intervalName('15m')).toBe('15 minutes')
    expect(cadence('1h')).toBe('Hourly')
    expect(cadence('4h')).toBe('Every 4 hours')
  })
})

describe('sentiment headline', () => {
  const counts = { bullish: 8, neutral: 4, bearish: 3, mixed: 2, uncertain: 1, unclassified: 0 }

  it('names the leading stance when it carries enough of the sample', () => {
    expect(stanceHeadline(counts, 18)).toMatchObject({ label: 'Bullish', count: 8 })
  })

  it('calls a sample with no clear leader split, and an empty one unclear', () => {
    const even = { ...counts, bullish: 4, neutral: 4, bearish: 4, mixed: 4 }
    expect(stanceHeadline(even, 18).label).toBe('Split')
    expect(
      stanceHeadline({ ...counts, bullish: 0, neutral: 0, bearish: 0, mixed: 0 }, 0).label
    ).toBe('No clear stance')
  })
})

describe('flow layout', () => {
  const node = (id: string) => ({ id, label: id })
  const spec = (edges: Array<[string, string]>, ids = ['a', 'b', 'c']) =>
    ({
      version: 1,
      type: 'flow',
      title: 't',
      direction: 'vertical',
      nodes: ids.map(node),
      edges: edges.map(([from, to]) => ({ from, to })),
    }) as unknown as VisualizationSpec

  it('orders a straight chain from its start, whatever order the edges came in', () => {
    expect(
      chainOf(
        spec([
          ['b', 'c'],
          ['a', 'b'],
        ])
      )?.map((n) => n.id)
    ).toEqual(['a', 'b', 'c'])
  })

  it('leaves a branch or a loop to the graph layout', () => {
    expect(
      chainOf(
        spec([
          ['a', 'b'],
          ['a', 'c'],
        ])
      )
    ).toBeNull()
    expect(
      chainOf(
        spec(
          [
            ['a', 'b'],
            ['b', 'a'],
          ],
          ['a', 'b']
        )
      )
    ).toBeNull()
  })
})

describe('trade analysis words', () => {
  it('says where the data leans, and selling what you do not hold is staying out', () => {
    expect(leanHeadline('buy', false)).toBe('Toward buying')
    expect(leanHeadline('hold', true)).toBe('Toward waiting')
    expect(leanHeadline('sell', true)).toBe('Toward selling')
    expect(leanHeadline('sell', false)).toBe('Against buying now')
    expect(sideCaption('sell', true)).toBe('Trim or exit')
    expect(sideCaption('sell', false)).toBe('Trim or stay out')
    expect(sideCaption('hold', false)).toBe('Wait and watch')
  })

  it('tilts the beam toward the side that leads, within twelve degrees', () => {
    expect(beamTilt({ buy: 48, sell: 11 })).toBeCloseTo(-8.88)
    expect(beamTilt({ buy: 9, sell: 53 })).toBeCloseTo(10.56)
    expect(beamTilt({ buy: 0, sell: 100 })).toBe(12)
    expect(beamTilt({ buy: 28, sell: 28 })).toBe(0)
  })

  it('hands the decision back, names the time, and uses no dash', () => {
    const text = disclaimerText('14:32')
    expect(text).toContain('at 14:32')
    expect(text).toContain('always up to you')
    expect(text).toContain('afford to lose')
    expect(text).not.toMatch(/[-\u2010-\u2015]/)
  })
})

describe('session tooltip', () => {
  const noon = new Date('2026-09-24T12:00:00Z')

  it("turns a New York time into the reader's own clock, daylight saving included", () => {
    // 4:00 in New York on 24 September (EDT, UTC-4) is 08:00 UTC.
    const expected = new Date('2026-09-24T08:00:00Z').toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    const inNewYork = Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York'
    expect(onYourClock([4, 0], noon)).toBe(inNewYork ? undefined : expected)
  })

  it('says what each session means, with its hours, and uses no dash', () => {
    expect(sessionTip('pre', noon)).toMatch(/^Nasdaq trades early, 4:00 to 9:30 New York time/)
    expect(sessionTip('open', noon)).toContain('9:30 to 16:00 New York time')
    expect(sessionTip('after', noon)).toContain('16:00 to 20:00 New York time')
    expect(sessionTip('closed', noon)).toContain('until premarket at 4:00 New York time')
    for (const kind of ['pre', 'open', 'after', 'closed'] as const) {
      expect(sessionTip(kind, noon)).not.toMatch(/[-\u2010-\u2015]/)
    }
  })
})

import type { PortfolioHistoryPoint } from '@x/services/catalyst'
import { describe, expect, it } from 'vitest'

import { describeLine, toSamples } from './pnl-series'

const point = (at: string, pnl: string, holdings = '1'): PortfolioHistoryPoint => ({
  at,
  total_pnl: pnl,
  realized_pnl: '0',
  unrealized_pnl: pnl,
  market_value: holdings,
  cost_basis: '1',
})

describe('toSamples', () => {
  it('turns server points into seconds and numbers', () => {
    const samples = toSamples([
      point('2026-09-23T06:00:00Z', '0', '0'),
      point('2026-09-23T07:00:00Z', '-0.0389', '1.187819'),
    ])

    expect(samples).toEqual([
      { time: 1790143200, pnl: 0, holdings: 0 },
      { time: 1790146800, pnl: -0.0389, holdings: 1.187819 },
    ])
  })

  it('keeps the later of two points in one second, which the chart would refuse', () => {
    const samples = toSamples([
      point('2026-09-24T04:00:00Z', '-0.03'),
      point('2026-09-24T04:00:00.589Z', '-0.0389'),
    ])

    expect(samples).toHaveLength(1)
    expect(samples[0].pnl).toBe(-0.0389)
  })

  it('drops a point it cannot read rather than drawing NaN', () => {
    expect(toSamples([point('not a time', '1'), point('2026-09-24T04:00:00Z', 'x')])).toEqual([])
  })
})

describe('describeLine', () => {
  it('says where the line starts, ends, and peaks, with signs', () => {
    const text = describeLine(
      toSamples([
        point('2026-09-23T06:00:00Z', '0'),
        point('2026-09-23T17:30:00Z', '0.0034'),
        point('2026-09-24T04:00:00Z', '-0.0389'),
      ]),
      '7d'
    )

    expect(text).toBe(
      'Total P&L over the last 7 days, from $0.00 to −$0.04, high $0.00, low −$0.04.'
    )
  })

  it('says so when there is nothing to draw', () => {
    expect(describeLine([], '24h')).toBe(
      'Total P&L over the last 24 hours: not enough points to draw.'
    )
  })
})

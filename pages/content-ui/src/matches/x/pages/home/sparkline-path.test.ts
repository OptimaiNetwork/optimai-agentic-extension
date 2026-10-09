import { MINIMUM_POINTS, sparklinePath, SPARKLINE_WIDTH } from './sparkline-path'
import { describe, expect, it } from 'vitest'

const pairs = (points: string): Array<[number, number]> =>
  points
    .split(' ')
    .filter(Boolean)
    .map((pair) => pair.split(',').map(Number) as [number, number])

describe('a day of price as one line', () => {
  it('rises to the right when the day rose', () => {
    const points = pairs(sparklinePath(['10', '20', '30'])!)
    const [first, , last] = points

    // SVG y grows downward, so a later point sitting higher means a smaller y.
    expect(last[1]).toBeLessThan(first[1])
    expect(first[0]).toBe(0)
    expect(last[0]).toBe(SPARKLINE_WIDTH)
  })

  it('draws a flat day flat rather than at NaN', () => {
    // A token that barely traded has 24 identical closes. Scaling by a span of
    // zero divides by zero and puts every point at NaN, which renders nothing
    // and reads as missing data rather than as a token that did not move.
    const points = sparklinePath(['5', '5', '5', '5'])!

    expect(points).not.toContain('NaN')
    expect(new Set(pairs(points).map(([, y]) => y)).size).toBe(1)
  })

  it('refuses to draw when there is not enough of a day', () => {
    // Two points is a horizontal rule that reads as a rendering bug.
    for (const values of [null, undefined, [], ['1'], ['1', '2']]) {
      expect(sparklinePath(values), String(values)).toBeNull()
    }
    expect(sparklinePath(Array(MINIMUM_POINTS).fill('1'))).not.toBeNull()
  })

  it('drops a value the server sent as something other than a number', () => {
    const points = sparklinePath(['1', 'nonsense', '2', '3'])!

    expect(points).not.toContain('NaN')
    expect(pairs(points)).toHaveLength(3)
  })

  it('keeps every point inside the box, so no stroke is clipped', () => {
    for (const [, y] of pairs(sparklinePath(['1', '900', '450', '2'])!)) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(20)
    }
  })
})

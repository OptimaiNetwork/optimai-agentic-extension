import { describe, expect, test } from 'vitest'

import { DOWN_COLOUR, trendColour, UP_COLOUR, withAlpha } from './trend'
import type { Candle } from '@x/services/catalyst'

const candle = (close: string): Candle =>
  ({
    open_time: '2026-09-24T00:00:00Z',
    open: close,
    high: close,
    low: close,
    close,
    volume: '1',
  }) as Candle

describe('the one colour a chart is drawn in', () => {
  test('green when the window closes at or above where it opened', () => {
    expect(trendColour([candle('220'), candle('218'), candle('225')])).toBe(UP_COLOUR)
    expect(trendColour([candle('220'), candle('220')])).toBe(UP_COLOUR)
  })

  test('red when it closes below', () => {
    expect(trendColour([candle('228.87'), candle('240'), candle('225.51')])).toBe(DOWN_COLOUR)
  })

  test('green for a window too short to have a direction', () => {
    expect(trendColour([])).toBe(UP_COLOUR)
    expect(trendColour([candle('10')])).toBe(UP_COLOUR)
  })
})

test('a colour at an alpha, for the fill', () => {
  expect(withAlpha('#00ba7c', 0.3)).toBe('rgba(0, 186, 124, 0.3)')
  expect(withAlpha('#f4212e', 0)).toBe('rgba(244, 33, 46, 0)')
})

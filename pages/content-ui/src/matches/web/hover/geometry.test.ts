import { describe, expect, test } from 'vitest'

import { bridgeBetween, isPointerOver } from './geometry'

const box = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
})

describe('whether the pointer is still over a word or its card', () => {
  const word = [box(100, 100, 160, 120)]
  const card = box(100, 130, 436, 530)

  test('on the word', () => {
    expect(isPointerOver(120, 110, word, card)).toBe(true)
  })

  test('on the card', () => {
    expect(isPointerOver(300, 400, word, card)).toBe(true)
  })

  test('just outside, within the slack', () => {
    expect(isPointerOver(163, 110, word, null)).toBe(true)
  })

  test('well away from both', () => {
    expect(isPointerOver(600, 50, word, card)).toBe(false)
  })

  test('on either line of a word that wraps', () => {
    const wrapped = [box(500, 100, 560, 120), box(0, 124, 40, 144)]
    expect(isPointerOver(20, 130, wrapped, null)).toBe(true)
  })
})

test('the bridge spans the gap between a word and a card below it', () => {
  const bridge = bridgeBetween(box(100, 100, 160, 120), box(90, 130, 426, 530))
  expect(bridge).toEqual({ left: 100, right: 160, top: 120, bottom: 130 })
})

test('the bridge spans the gap between a word and a card beside it', () => {
  const bridge = bridgeBetween(box(100, 300, 160, 320), box(170, 12, 550, 500))
  expect(bridge).toEqual({ left: 160, right: 170, top: 300, bottom: 320 })
})

import { describe, expect, test } from 'vitest'

import { ANCHOR_GAP, placePopover, VIEWPORT_MARGIN } from './position'

const viewport = { width: 1280, height: 900 }
const card = { width: 336, height: 445 }
const word = (top: number, left = 264) => ({ left, right: left + 60, top, bottom: top + 18 })

const covers = (anchor: { top: number; bottom: number }, top: number, height: number) =>
  top < anchor.bottom && top + height > anchor.top

describe('where the card goes', () => {
  test('under the word when it fits', () => {
    const anchor = word(100)
    const placed = placePopover(anchor, card, viewport)

    expect(placed.top).toBe(anchor.bottom + ANCHOR_GAP)
    expect(placed.maxHeight).toBeGreaterThanOrEqual(card.height)
  })

  test('above the word when only that fits', () => {
    const anchor = word(800)
    const placed = placePopover(anchor, card, viewport)

    expect(placed.top + card.height).toBe(anchor.top - ANCHOR_GAP)
  })

  test('beside the word, at full height, when neither above nor below fits', () => {
    const anchor = word(440)
    const placed = placePopover(anchor, card, viewport)

    expect(placed.left).toBe(anchor.right + ANCHOR_GAP)
    expect(placed.maxHeight).toBeGreaterThanOrEqual(card.height)
    expect(placed.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN)
    expect(placed.top + card.height).toBeLessThanOrEqual(viewport.height - VIEWPORT_MARGIN)
    // Level with the word, so the pointer crosses straight over.
    expect(placed.top).toBeLessThanOrEqual(anchor.top)
    expect(placed.top + card.height).toBeGreaterThanOrEqual(anchor.bottom)
  })

  test('on the left of the word when only the left has room', () => {
    const anchor = word(440, 1000)
    const placed = placePopover(anchor, card, viewport)

    expect(placed.left + card.width).toBe(anchor.left - ANCHOR_GAP)
    expect(placed.maxHeight).toBeGreaterThanOrEqual(card.height)
  })

  test('on the roomier side, shortened, when nothing fits — never over the word', () => {
    const narrow = { width: 420, height: 900 }
    const anchor = word(440, 40)
    const placed = placePopover(anchor, card, narrow)
    const height = Math.min(card.height, placed.maxHeight)

    expect(covers(anchor, placed.top, height)).toBe(false)
    expect(placed.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN)
    expect(placed.top + height).toBeLessThanOrEqual(narrow.height - VIEWPORT_MARGIN)
  })

  test('inside the window horizontally', () => {
    expect(placePopover(word(100, 1200), card, viewport).left).toBe(
      viewport.width - card.width - VIEWPORT_MARGIN
    )
    expect(placePopover(word(100, 0), card, viewport).left).toBe(VIEWPORT_MARGIN)
  })
})

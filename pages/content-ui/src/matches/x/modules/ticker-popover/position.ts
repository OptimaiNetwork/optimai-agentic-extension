import { useCallback, useLayoutEffect, useState, type RefObject } from 'react'

/** The popover's width, less whatever a narrow window takes from it. */
export const POPOVER_WIDTH = 336
/** Kept clear between the popover and the window edge. */
export const VIEWPORT_MARGIN = 12
/** Between the popover and the word it belongs to. */
export const ANCHOR_GAP = 10

export interface Point {
  left: number
  top: number
  /** The most the card may grow to without covering its word or leaving the window. */
  maxHeight: number
}

export interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * Beside the word, level with it and as tall as the window allows: right of it
 * when there is room, else left of it, else nowhere (null).
 */
const besideWord = (
  anchor: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): Point | null => {
  const room = viewport.height - 2 * VIEWPORT_MARGIN
  if (size.height > room) return null
  const rightRoom = viewport.width - anchor.right - ANCHOR_GAP - VIEWPORT_MARGIN
  const leftRoom = anchor.left - ANCHOR_GAP - VIEWPORT_MARGIN
  const left =
    size.width <= rightRoom
      ? anchor.right + ANCHOR_GAP
      : size.width <= leftRoom
        ? anchor.left - ANCHOR_GAP - size.width
        : null
  if (left === null) return null
  const centred = (anchor.top + anchor.bottom) / 2 - size.height / 2
  const top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(centred, viewport.height - VIEWPORT_MARGIN - size.height)
  )
  return { left, top, maxHeight: room }
}

/**
 * Where the popover goes: under its word when it fits, above when that fits
 * instead, beside it when neither does and the side has room, and otherwise on
 * whichever of above and below has more room, shortened to that room. It never
 * covers the word it belongs to and never leaves the window.
 *
 * The side exists for the card with a chart: a word halfway down a 900px window
 * has about 430px above and below, and that card is taller. Shortened, it grew
 * a scrollbar; beside the word it has the whole height of the window. Clamping
 * to the top edge, as this once did, drew the card over the word instead.
 *
 * Pure so the choice can be tested without a layout engine — happy-dom reports
 * every rect as zero.
 */
export const placePopover = (
  anchor: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): Point => {
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(anchor.left, viewport.width - size.width - VIEWPORT_MARGIN)
  )
  const below = Math.max(0, viewport.height - anchor.bottom - ANCHOR_GAP - VIEWPORT_MARGIN)
  const above = Math.max(0, anchor.top - ANCHOR_GAP - VIEWPORT_MARGIN)

  if (size.height <= below) return { left, top: anchor.bottom + ANCHOR_GAP, maxHeight: below }
  if (size.height <= above) {
    return { left, top: anchor.top - ANCHOR_GAP - size.height, maxHeight: above }
  }
  const beside = besideWord(anchor, size, viewport)
  if (beside) return beside
  if (below >= above) return { left, top: anchor.bottom + ANCHOR_GAP, maxHeight: below }
  return { left, top: anchor.top - ANCHOR_GAP - above, maxHeight: above }
}

export const popoverWidth = (viewportWidth: number): number =>
  Math.min(POPOVER_WIDTH, Math.max(0, viewportWidth - 2 * VIEWPORT_MARGIN))

/**
 * Keeps a fixed-position popover beside its trigger through scrolling and
 * resizing, and reports when the trigger has left the page.
 *
 * `fallbackHeight` is used until the popover has been measured once; it should
 * be close to the real height, or the first frame can open on the wrong side.
 */
export const usePopoverPosition = (
  trigger: HTMLElement,
  popover: RefObject<HTMLElement | null>,
  { fallbackHeight, onLost }: { fallbackHeight: number; onLost: () => void }
): Point | null => {
  const [position, setPosition] = useState<Point | null>(null)

  const update = useCallback(() => {
    if (!trigger.isConnected) {
      onLost()
      return
    }
    const next = placePopover(
      trigger.getBoundingClientRect(),
      {
        // Measured: the card on other sites is wider than the one on a tweet.
        width: popover.current?.offsetWidth || popoverWidth(window.innerWidth),
        // The height the content wants, not the height a previous placement
        // allowed it: a card once shortened to fit above must be able to choose
        // below again when the page scrolls.
        height: popover.current?.scrollHeight || fallbackHeight,
      },
      { width: window.innerWidth, height: window.innerHeight }
    )
    setPosition((current) =>
      current?.left === next.left &&
      current.top === next.top &&
      current.maxHeight === next.maxHeight
        ? current
        : next
    )
  }, [fallbackHeight, onLost, popover, trigger])

  useLayoutEffect(() => {
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    // The card changes height on its own — "Loading…" becomes a price, a chart
    // and a grid — and a card placed above its word while short would grow down
    // over the word. Placing it again whenever its size changes prevents that.
    const element = popover.current
    const observer =
      element && typeof ResizeObserver === 'function' ? new ResizeObserver(() => update()) : null
    if (element) observer?.observe(element)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      observer?.disconnect()
    }
  }, [popover, update])

  return position
}

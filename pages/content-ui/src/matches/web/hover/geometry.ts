/** Slack around the word and the card, so a pointer crossing the gap between them keeps the card. */
export const HOVER_TOLERANCE_PX = 6

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

const inside = (x: number, y: number, box: Box, slack: number): boolean =>
  x >= box.left - slack && x <= box.right + slack && y >= box.top - slack && y <= box.bottom + slack

/**
 * Whether a pointer at (x, y) is still over the word or its card.
 *
 * Asked of the geometry, not of which element the pointer is over. A page can
 * draw its own hover card on top of the word — Wikipedia does for every link —
 * and then the pointer is "over" that card while sitting on our word; judged by
 * events, ours closed the moment theirs opened. A word that wraps onto two lines
 * has two boxes, and either counts.
 */
export const isPointerOver = (
  x: number,
  y: number,
  word: Iterable<Box>,
  card: Box | null,
  slack = HOVER_TOLERANCE_PX
): boolean => {
  for (const box of word) {
    if (inside(x, y, box, slack)) return true
  }
  return card !== null && inside(x, y, card, slack)
}

/**
 * The rectangle between the word and its card, so moving the pointer straight
 * from one to the other never passes through "neither". The card sits above or
 * below the word, or beside it when neither had the room.
 */
export const bridgeBetween = (word: Box, card: Box): Box => {
  const beside = word.right <= card.left || card.right <= word.left
  if (beside) {
    return {
      left: Math.min(word.right, card.right),
      right: Math.max(word.left, card.left),
      top: Math.max(word.top, card.top),
      bottom: Math.min(word.bottom, card.bottom),
    }
  }
  return {
    left: Math.max(word.left, card.left),
    right: Math.min(word.right, card.right),
    top: Math.min(word.bottom, card.bottom),
    bottom: Math.max(word.top, card.top),
  }
}

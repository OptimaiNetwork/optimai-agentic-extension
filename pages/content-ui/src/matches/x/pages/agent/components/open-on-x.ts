import type { KeyboardEvent } from 'react'

type OpenableProps = {
  role: 'button'
  tabIndex: 0
  'aria-label': string
  onClick: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

/**
 * Makes a region that stands for one thing on X open that thing.
 *
 * There is no separate "View on X" control any more. A card that shows a post
 * *is* the post as far as a reader is concerned, and a button underneath it
 * saying so was a second, smaller copy of a target that already filled the
 * card. This is also how X itself behaves, and how `FeedRow` behaves in the
 * source these cards are ported from.
 *
 * `role="button"` on a `<div>` rather than an actual `<button>`: these regions
 * hold flow content — paragraphs, lists, nested rows — which `<button>`'s
 * phrasing-only content model forbids, and wrapping them made the markup
 * invalid and degraded screen-reader output. Keyboard operation is
 * therefore wired by hand.
 *
 * The `event.target !== event.currentTarget` guard keeps a nested control from
 * firing twice: a keyboard user who tabs to Show more and presses Enter should
 * expand the text, not also open the browser. Nested *click* handlers stop
 * their own propagation for the same reason.
 */
export function openOnXProps(url: string, label: string): OpenableProps {
  // A desktop app would hand the URL to its shell. A content script just opens a tab,
  // and `noopener` because the target is a page somebody else wrote.
  const open = (): void => void window.open(url, '_blank', 'noopener,noreferrer')
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': `${label} — opens on X in your browser`,
    onClick: open,
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    },
  }
}

/** The hover and focus treatment every openable region shares. */
export const OPENABLE_CLASS =
  'cursor-pointer transition-colors hover:bg-muted/20 focus-visible:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset'

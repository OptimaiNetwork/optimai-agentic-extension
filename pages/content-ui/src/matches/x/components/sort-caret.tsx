/**
 * Both arrows, always, with only the one in force lit.
 *
 * Lifted out of the market list so the ticker page's markets table sorts the
 * way the market screen does. A header that draws a single caret and hides it
 * on the inactive columns reads as three dead headings and one control; a
 * dimmed pair says "this sorts, and here is which way", which is what every
 * market screen does and therefore what people already know how to read.
 */
export const SortCaret = ({
  active,
  direction,
}: {
  active: boolean
  direction: 'asc' | 'desc'
}) => (
  <svg viewBox="0 0 8 13" className="ml-0.5 h-[9px] w-2 shrink-0" aria-hidden>
    <path
      d="M4 0 8 4.5H0z"
      className={active && direction === 'asc' ? 'fill-primary' : 'fill-current opacity-25'}
    />
    <path
      d="M4 13 0 8.5h8z"
      className={active && direction === 'desc' ? 'fill-primary' : 'fill-current opacity-25'}
    />
  </svg>
)

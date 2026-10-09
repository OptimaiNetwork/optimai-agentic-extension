import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Search, folded away until it is wanted.
 *
 * A permanently open field is a permanent claim that searching is the main
 * thing you do here, and it is not: the list opens ranked by market cap, and
 * most people take what is near the top. The field cost a full-width row on
 * every open to serve the times it did not.
 *
 * The field slides out *underneath* the button rather than pushing it aside, so
 * the button never moves — the thing you just clicked is still where your
 * cursor is when you want to close it again. That is why the field is absolutely
 * positioned and the button is raised above it, and why the field's right
 * padding clears the button's width.
 *
 * It stops at just over a third of the row because that is all a ticker needs,
 * and because stopping short leaves the page still naming itself while you type.
 */

/** A share of the title row — the field is positioned against that row, not this one. */
const OPEN_WIDTH = '36%'

/** Room for the button sitting on top of the field's right edge. */
const BUTTON_CLEARANCE = 'pr-8'

const EASE = [0.16, 1, 0.3, 1] as const

export const MarketSearch = ({
  query,
  onQuery,
}: {
  query: string
  onQuery: (next: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const field = useRef<HTMLInputElement>(null)

  // Focus after the width animation has somewhere to put the caret. Focusing a
  // zero-width input scrolls the row in some engines.
  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  const close = () => {
    setOpen(false)
    // Collapsing while a query is live would hide the reason the list is short.
    onQuery('')
  }

  return (
    <>
      <motion.div
        initial={false}
        animate={{ width: open ? OPEN_WIDTH : '0%', opacity: open ? 1 : 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="rounded-10 absolute right-0 top-0 h-7 overflow-hidden bg-white/[0.06]">
        <input
          ref={field}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close()
          }}
          // Collapsing an empty field on blur keeps the row tidy without ever
          // throwing away something typed.
          onBlur={() => {
            if (!query.trim()) setOpen(false)
          }}
          placeholder="Ticker"
          aria-label="Search a ticker"
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          className={`text-12 text-foreground placeholder:text-muted-foreground/60 h-full w-full bg-transparent pl-2.5 outline-none ${BUTTON_CLEARANCE}`}
        />
      </motion.div>

      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close search' : 'Search a ticker'}
        onClick={() => (open ? close() : setOpen(true))}
        className="text-foreground relative z-10 ml-auto shrink-0 rounded-full p-1 transition-colors hover:bg-white/10">
        {open ? <X className="size-3.5" /> : <Search className="size-3.5" />}
      </button>
    </>
  )
}

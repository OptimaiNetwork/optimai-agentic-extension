import { useEffect, useState } from 'react'

/** Starts a badge's fetch a little before it scrolls in, so its price is there when it arrives. */
const LOOKAHEAD = '200px'

const waiting = new Map<Element, () => void>()
let observer: IntersectionObserver | null = null

const shared = (): IntersectionObserver | null => {
  if (observer || typeof IntersectionObserver !== 'function') return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        waiting.get(entry.target)?.()
        waiting.delete(entry.target)
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: LOOKAHEAD }
  )
  return observer
}

/**
 * Whether an element has come near the viewport yet. Latches: once seen, it
 * stays true, because all it gates is a first fetch.
 *
 * One observer for every badge on the page rather than one each. Where there is
 * no IntersectionObserver, everything counts as seen.
 */
export const useSeen = (element: Element): boolean => {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver !== 'function')

  useEffect(() => {
    if (seen) return
    const io = shared()
    if (!io) return
    waiting.set(element, () => setSeen(true))
    io.observe(element)
    return () => {
      waiting.delete(element)
      io.unobserve(element)
    }
  }, [element, seen])

  return seen
}

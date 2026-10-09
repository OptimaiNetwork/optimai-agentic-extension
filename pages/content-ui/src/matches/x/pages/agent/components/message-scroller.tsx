import { cn } from '@extension/ui'
import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * A transcript viewport that follows new output — until the reader stops it.
 *
 * Keeps the follow-output core of a chat scroller and leaves out any preview
 * rail, so this does not drag
 * in an animation tree the panel has no room for.
 *
 * The behaviour being ported is the one that matters and the one this panel got
 * wrong: it used to call `scrollIntoView` on every transcript change, which
 * yanks the view back to the bottom while somebody is reading an earlier answer
 * — and a research answer is precisely the thing a reader scrolls up to re-read
 * while the next tool call is still running.
 *
 * So: follow while the reader is near the end, stop the moment they scroll away,
 * and offer them a way back rather than deciding for them.
 *
 * `programmatic` exists because this component's own scrolling fires the same
 * `scroll` event a reader's does. Without it, the first auto-scroll would be
 * read as the reader scrolling and following would switch itself off.
 */

/** Distance from the end that still counts as being at the end. */
const FOLLOW_THRESHOLD = 56

export const MessageScroller = ({
  children,
  className,
  /** Changes to this re-run the follow. Pass whatever means "new output". */
  dependency,
}: {
  children: React.ReactNode
  className?: string
  dependency: unknown
}) => {
  const viewport = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  const programmatic = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [showJump, setShowJump] = useState(false)

  const scrollToEnd = useCallback((behavior: ScrollBehavior) => {
    const node = viewport.current
    if (!node) return
    programmatic.current = true
    node.scrollTo?.({ top: node.scrollHeight, behavior })
    clearTimeout(timer.current)
    timer.current = setTimeout(
      () => {
        programmatic.current = false
      },
      behavior === 'smooth' ? 320 : 0
    )
  }, [])

  const handleScroll = useCallback(() => {
    const node = viewport.current
    if (!node || programmatic.current) return
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    following.current = distance <= FOLLOW_THRESHOLD
    setShowJump(!following.current)
  }, [])

  // Layout effect, not effect: the scroll has to happen in the same frame the
  // new content is laid out, or the reader sees the view jump afterwards.
  useLayoutEffect(() => {
    if (following.current) scrollToEnd('auto')
  }, [dependency, scrollToEnd])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewport}
        onScroll={handleScroll}
        className={cn('scrollable h-full overflow-y-auto', className)}>
        {children}
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => {
            following.current = true
            setShowJump(false)
            scrollToEnd('smooth')
          }}
          className="text-xxs bg-surface text-foreground border-border-soft hover:bg-border-soft absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2.5 py-1 shadow-lg transition-colors">
          <ArrowDown className="size-3" />
          Latest
        </button>
      )}
    </div>
  )
}

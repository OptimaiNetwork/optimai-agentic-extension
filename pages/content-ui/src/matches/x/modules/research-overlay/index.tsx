import { stopTurn } from '@x/modules/agent-runtime'
import type { ResearchState } from '@x/modules/research'
import { cn } from '@extension/ui'
import { Square } from 'lucide-react'
import { useEffect } from 'react'

import { XLogoIcon } from '@x/pages/agent/components/x-icons'

/**
 * What the user sees while their own tab is being driven.
 *
 * One card, top left, over a dimmed page. The number that matters is the
 * number of posts the reading sweep has passed over, so it is the biggest
 * thing on the card; the query is there so a reader can check the agent
 * searched what they meant; the bar is that same count against the target,
 * never a percentage of "research done". The parsed count sits beside it in
 * small type because it runs a batch ahead of the sweep and is the number
 * the answer will actually be built from.
 *
 * Every listener it installs is removed in the same effect's cleanup, and the
 * overlay itself only exists while the run does.
 */
export const ResearchOverlay = ({ state }: { state: ResearchState }) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void stopTurn('escape')
        return
      }
      // The collector scrolls programmatically; those are not keyboard events,
      // so blocking these does not block the run.
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
      }
    }
    const stopWheel = (event: WheelEvent) => event.preventDefault()
    const stopTouch = (event: TouchEvent) => event.preventDefault()
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('wheel', stopWheel, { capture: true, passive: false })
    window.addEventListener('touchmove', stopTouch, { capture: true, passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('wheel', stopWheel, { capture: true })
      window.removeEventListener('touchmove', stopTouch, { capture: true })
    }
  }, [])

  const collecting = state.status === 'collecting'
  const percent = Math.min(100, (state.read / Math.max(1, state.target)) * 100)
  const phase =
    state.status === 'preparing'
      ? 'Preparing'
      : state.status === 'navigating'
        ? 'Opening the search'
        : state.status === 'finalizing'
          ? 'Wrapping up'
          : 'Reading posts'

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-10 bg-black/50 backdrop-blur-[1px]"
      aria-live="polite"
      aria-label="OptimAI Agentic is collecting posts from X">
      <div className="bg-brown/95 border-border-soft absolute left-4 top-4 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border shadow-2xl">
        {/* Header: what is happening, and the mode as a chip. */}
        <div className="flex items-center gap-2.5 px-4 pt-3.5">
          <span className="relative flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-black text-white">
            <XLogoIcon className="size-3.5" />
            <span
              aria-hidden
              className={cn(
                'bg-brand absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-[#212121]',
                collecting && 'animate-pulse'
              )}
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-13 text-foreground font-semibold leading-[17px]">{phase}</span>
            <span className="text-11 text-faint truncate leading-[14px]">{state.statusText}</span>
          </div>
          {state.mode && (
            <span className="text-xxs bg-surface text-faint flex h-5 shrink-0 items-center rounded-full px-2 font-bold uppercase tracking-wide">
              {state.mode === 'latest' ? 'Latest' : 'Top'}
            </span>
          )}
        </div>

        {/* The query, as the reader would type it. */}
        {state.query && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-[10px] bg-black/30 px-2.5 py-1.5">
            <span className="text-faint text-13 shrink-0 font-semibold">$</span>
            <span className="text-13 text-foreground/85 truncate font-medium">{state.query}</span>
          </div>
        )}

        {/* The count, then the bar under it. */}
        <div className="flex items-end justify-between gap-3 px-4 pt-3.5">
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-foreground text-[28px] font-semibold leading-none tracking-tight">
              {state.read}
            </span>
            <span className="text-13 text-faint leading-none">/ {state.target} read</span>
          </div>
          <span className="text-11 text-faint tabular-nums leading-none">
            {state.collected} collected
          </span>
        </div>
        <div className="mx-4 mb-4 mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="bg-brand relative h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${state.read > 0 ? Math.max(3, percent) : 0}%` }}>
            {collecting && (
              <span
                aria-hidden
                className="absolute inset-y-0 right-0 w-6 rounded-full bg-white/40 blur-[3px]"
              />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void stopTurn()}
          className="border-border-soft text-13 text-foreground hover:bg-surface flex h-10 w-full items-center justify-center gap-2 border-t font-medium transition-colors">
          <Square className="size-3 fill-current" />
          Stop
          <kbd className="text-xxs text-faint bg-surface ml-1 rounded px-1.5 py-0.5 font-sans">
            Esc
          </kbd>
        </button>
      </div>
    </div>
  )
}

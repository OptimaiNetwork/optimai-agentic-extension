import { useSidebarInjection } from '@/matches/x/modules/sidebar-injection'
import { useSearchCard } from '@/matches/x/modules/search-card'
import { useTweetInjection } from '@/matches/x/modules/tweet-injection'
import { setAliases, startCollecting } from '@/matches/x/modules/x-network'
import { useTradableNames } from '@/matches/x/queries/catalyst/use-tradable-names'
import QueryProvider from '@/matches/x/providers/query'
import { Toaster } from '@extension/ui'
import { motion } from 'framer-motion'
import { PropsWithChildren, Suspense, useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { dynamicPaths, PATHS } from '@/matches/x/routers/paths'
import { setSelection } from '@/matches/x/modules/venue'
import type { ChainId, VenueId } from '@extension/shared'
import { PanelOpenProvider } from './panel-open'
import { PanelHeader } from './panel-header'
import { useResearchState } from '@/matches/x/modules/research'
import { ResearchOverlay } from '@/matches/x/modules/research-overlay'
import { shutdownRunController, stopTurn } from '@/matches/x/modules/agent-runtime'
import { drainPortfolioTradeQueue } from '@/matches/x/modules/portfolio'
import { catalystKeys } from '@/matches/x/queries/catalyst/keys'
import { useQueryClient } from '@tanstack/react-query'
import {
  restoreCheckpoint,
  startCheckpointing,
} from '@/matches/x/modules/agent-conversation/checkpoint'

/**
 * The seam between anything on the page and this panel.
 *
 * A button injected into a tweet's action bar has no import path back here — it
 * is a separate React root in X's light DOM. It asks for the panel by
 * dispatching this event on `document`; the panel is the only listener.
 */
export const OPEN_PANEL_EVENT = 'catalyst:open'

export interface OpenPanelDetail {
  /** Underlying listed ticker, already resolved from the cashtag, e.g. NVDA. */
  ticker: string
  /** Tweet the request came from, when there was one. */
  tweetId?: string
  venue?: VenueId
  chain?: ChainId
  /**
   * Which screen to land on. The search card offers both doors — the read and
   * the trade — and a caller that names neither gets the read, which is what
   * every caller wanted before there was a choice.
   */
  view?: 'read' | 'trade' | 'ask'
}

const PANEL_WIDTH = 500

/**
 * One provider, on purpose.
 *
 * The stack this was forked from wrapped every page in sign-in, an X-profile
 * build, a URL crawler and a Redux store of all three. None of it belongs to
 * this product: the price, the chart and the read all work signed out, and the
 * only key that matters is the one in the user's own wallet at the moment they
 * sign a purchase. What is left is server state, which TanStack Query already
 * owns — there was no client state for Redux to hold.
 */
const Providers = ({ children }: PropsWithChildren) => <QueryProvider>{children}</QueryProvider>

const LoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center bg-black">
    <div className="text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white/80" />
      <p className="mt-4 text-sm text-white/70">Loading...</p>
    </div>
  </div>
)

const App = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const research = useResearchState()
  const queryClient = useQueryClient()

  const collecting = research.status !== 'idle'

  useEffect(() => {
    const invalidatePortfolios = () => {
      void queryClient.invalidateQueries({ queryKey: [...catalystKeys.all, 'portfolio'] })
    }
    // This listener lives above the route so a successful drain also marks a
    // cached, currently unmounted Portfolio page stale for its next visit.
    window.addEventListener('catalyst:portfolio-recorded', invalidatePortfolios)
    window.addEventListener('catalyst:portfolio-recording-updated', invalidatePortfolios)
    return () => {
      window.removeEventListener('catalyst:portfolio-recorded', invalidatePortfolios)
      window.removeEventListener('catalyst:portfolio-recording-updated', invalidatePortfolios)
    }
  }, [queryClient])

  useEffect(() => {
    void drainPortfolioTradeQueue()
    const timer = window.setInterval(() => void drainPortfolioTradeQueue(), 8_000)
    return () => window.clearInterval(timer)
  }, [])

  const toggle = useCallback(() => {
    // The sidebar button is the panel's front door: opening it starts at the
    // Token list, while the Agent conversation remains in its own store.
    if (!isOpen && location.pathname !== PATHS.HOME) navigate(PATHS.HOME)
    // Closing the panel mid-collection stops the whole turn, not just the
    // overlay: leaving a tab scrolling under a panel nobody can see is the one
    // behaviour this feature must never have.
    if (isOpen && collecting) void stopTurn('panel_closed')
    setIsOpen((open) => !open)
  }, [collecting, isOpen, location.pathname, navigate])
  useSidebarInjection({ onToggle: toggle })

  // One fetch of the tradable universe decides which cashtags get a button, so
  // scrolling the timeline never touches the network. Not a page of the catalog:
  // that gave Ondo a hundred of its 442 names and left the rest unrecognised.
  const { data: supported } = useTradableNames()
  useTweetInjection(supported)
  useSearchCard(supported)

  // The catalog lands a fetch after the collector starts, so whatever was
  // captured in between is re-filed under the right ticker rather than lost.
  useEffect(() => {
    if (supported) setAliases(supported.aliases)
  }, [supported])

  // Listening from the moment the panel mounts, not from when somebody opens it:
  // the posts worth reading are the ones that scrolled past before anybody asked.
  useEffect(() => startCollecting(), [])

  // The transcript outlives a reload; a run does not. `restoreCheckpoint` marks
  // an interrupted search as interrupted rather than silently repeating it.
  useEffect(() => {
    void restoreCheckpoint()
    const stopCheckpointing = startCheckpointing()
    return () => {
      stopCheckpointing()
      shutdownRunController()
    }
  }, [])

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<OpenPanelDetail>).detail
      if (detail?.ticker) {
        if (detail.venue) setSelection(detail.venue, detail.chain)
        const to =
          detail.view === 'trade'
            ? dynamicPaths.buy(detail.ticker)
            : detail.view === 'ask'
              ? dynamicPaths.agentTicker(detail.ticker)
              : dynamicPaths.ticker(detail.ticker)
        navigate(to, {
          state: detail.venue ? { venue: detail.venue, chain: detail.chain } : undefined,
        })
      }
      setIsOpen(true)
    }
    document.addEventListener(OPEN_PANEL_EVENT, open)
    return () => document.removeEventListener(OPEN_PANEL_EVENT, open)
  }, [navigate])

  return (
    <>
      {/* Always mounted, never unmounted: the container's presence is what proves
          the content script injected, and sliding it out is cheaper than tearing
          down the React tree every time the panel closes. */}
      <motion.div
        id="catalyst-extension-container"
        data-open={isOpen}
        className="fixed inset-y-0 right-0 z-20 overflow-hidden"
        style={{ width: PANEL_WIDTH, pointerEvents: isOpen ? 'auto' : 'none' }}
        initial={false}
        animate={{ x: isOpen ? 0 : PANEL_WIDTH, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}>
        <div className="text-foreground flex h-full flex-col bg-black">
          <PanelOpenProvider value={isOpen}>
            <PanelHeader />
            {/* Keyed on the path so a route change remounts the subtree and the
                enter animation runs. Deliberately no `AnimatePresence`: an
                exiting `Outlet` re-renders with the *new* route's content, so
                the old screen would slide out showing the new one. */}
            <motion.div
              key={location.pathname}
              className="min-h-0 flex-1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}>
              <Outlet />
            </motion.div>
          </PanelOpenProvider>
        </div>
      </motion.div>
      {/* Only while the browser is actually being driven. Backend reasoning
          shows inside the panel, where it does not take the page away. */}
      {collecting && <ResearchOverlay state={research} />}
    </>
  )
}

const GlobalLayout = () => (
  <Providers>
    <style>
      {`
        .scrollable{
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
        .scrollable::-webkit-scrollbar { width: 4px; }
        .scrollable::-webkit-scrollbar-track { background: transparent; }
        .scrollable::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
        }
        .scrollable::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        [data-sonner-toast] { filter: unset; }
      `}
    </style>
    <Suspense fallback={<LoadingFallback />}>
      <App />
      <Toaster />
    </Suspense>
  </Providers>
)

export default GlobalLayout

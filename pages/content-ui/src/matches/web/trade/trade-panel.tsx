import { Logo } from '@extension/ui'
import BuyPage from '@x/pages/buy'
import TickerPage from '@x/pages/ticker'
import { dynamicPaths, PATHS } from '@x/routers/paths'
import type { TokenNavigationState } from '@x/routers/paths'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ChainSwitch } from './chain-switch'
import { usePortfolioDrain } from './portfolio-drain'
import { closeTradePanel, TRADE_PANEL_WIDTH, useWebTrade } from './store'
import type { WebTradeIntent } from './store'

/**
 * The X panel's own token page and buy screen, without the agent.
 *
 * The history holds the token page and then the order form, both carrying the
 * listing as route state the way a tweet button's navigation does: the buy
 * screen's Back and Done land on the token, and the token's Buy comes back.
 * A Trade opens on the order form; a chain switch reopens on whichever screen
 * was showing.
 */
const TradeRouter = ({ intent, children }: { intent: WebTradeIntent; children: ReactNode }) => {
  const state: TokenNavigationState = { venue: intent.venue, chain: intent.chain }
  return (
    <MemoryRouter
      initialEntries={[
        { pathname: dynamicPaths.token(intent.ticker), state },
        { pathname: dynamicPaths.buy(intent.ticker), state },
      ]}
      initialIndex={intent.screen === 'token' ? 0 : 1}>
      {children}
    </MemoryRouter>
  )
}

/** Escape closes the panel, unless it is closing a menu open inside it. */
const isInsideMenu = (event: KeyboardEvent): boolean =>
  event
    .composedPath()
    .some((node) => node instanceof Element && node.getAttribute('role') === 'listbox')

const OpenPanel = ({ intent }: { intent: WebTradeIntent }) => {
  usePortfolioDrain()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isInsideMenu(event)) closeTradePanel()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <motion.aside
      role="dialog"
      aria-label={`Trade ${intent.symbol ?? intent.ticker}`}
      className="text-foreground fixed inset-y-0 right-0 flex flex-col bg-black font-sans shadow-2xl"
      style={{ width: `min(${TRADE_PANEL_WIDTH}px, 100vw)`, pointerEvents: 'auto' }}
      initial={{ x: TRADE_PANEL_WIDTH, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: TRADE_PANEL_WIDTH, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}>
      {/* Keyed so a new token or a new chain starts both screens fresh. */}
      <TradeRouter key={intent.openedAt} intent={intent}>
        <header className="border-border-soft flex flex-shrink-0 items-center gap-2 border-b px-4 py-3">
          <Logo className="h-5 w-auto" />
          <ChainSwitch intent={intent} />
          <button
            type="button"
            aria-label="Close trade panel"
            onClick={closeTradePanel}
            className="text-muted-foreground hover:bg-white/8 hover:text-foreground ml-auto rounded-full p-1 transition-colors">
            <X className="size-4" />
          </button>
        </header>
        {/* Positioned and sized: the buy screen fills its parent, and its success
            dialog covers the nearest positioned ancestor. */}
        <div className="relative min-h-0 flex-1">
          <Routes>
            <Route path={PATHS.TOKEN} element={<TickerPage canAsk={false} canGoBack={false} />} />
            <Route path={PATHS.BUY} element={<BuyPage />} />
          </Routes>
        </div>
      </TradeRouter>
    </motion.aside>
  )
}

/**
 * Trading on a page that is not X: the X panel's buy screen and token page,
 * injected into the page's own shadow root and pinned right, as on X.
 *
 * Injected rather than in Chrome's side panel, on purpose: MetaMask can show its
 * confirmations in its own side panel, which replaces any other extension's —
 * and a side panel closed mid-signature takes the signed Solana transaction
 * with it before it is sent. Here MetaMask's panel only narrows the page. On a
 * page, a Solana signature also goes straight to the page's own wallet bridge.
 */
export const TradePanel = () => {
  const intent = useWebTrade()
  return (
    <AnimatePresence>
      {/* One key for every open, so a second Trade or a chain switch swaps what
          is inside rather than sliding the panel out and back in. */}
      {intent ? <OpenPanel key="trade" intent={intent} /> : null}
    </AnimatePresence>
  )
}

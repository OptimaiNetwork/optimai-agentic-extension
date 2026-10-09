import { motion } from 'framer-motion'
import { Bot, Coins, Check, BriefcaseBusiness } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAgentConversation } from '@/matches/x/modules/agent-conversation'
import { dynamicPaths, PATHS } from '@/matches/x/routers/paths'

import { useDismiss } from './use-dismiss'

/**
 * The panel's navigation, in a menu rather than a tab bar.
 *
 * Two tabs cost a permanent 36px row to say which of two screens you are on —
 * a price a 500px panel pays on every open, for a choice most people make once.
 * A menu costs a 16px button and gives the rest back to the market.
 *
 * It also stops the header claiming more than it can keep: a tab bar implies
 * cheap, stateless flipping between peers, and these two are not peers. The
 * Agent carries a conversation that outlives navigation; the market does not.
 */

/** Half the bar height, so `top-1/2` lands the bar's centre on the centre. */
const HALF_BAR = -1

/** How far each bar sits from the middle when it is a menu rather than a cross. */
const SPREAD = 3.5

const LONG = 14
const SHORT = 9

const BAR = 'absolute inset-x-0 top-1/2 mx-auto h-0.5 rounded-full bg-current'

const isAgentRoute = (pathname: string): boolean =>
  pathname.startsWith('/agent') || pathname.startsWith('/ask')
const isPortfolioRoute = (pathname: string): boolean => pathname === PATHS.PORTFOLIO

/**
 * Two bars that become a cross.
 *
 * Deliberately uneven when closed — the lower bar is shorter — because two
 * equal bars at this size read as an equals sign. They match on opening, which
 * is also what makes the cross symmetrical.
 */
const Bars = ({ open }: { open: boolean }) => (
  <span className="relative block size-4" aria-hidden>
    <motion.span
      className={BAR}
      initial={false}
      animate={{
        width: LONG,
        y: open ? HALF_BAR : HALF_BAR - SPREAD,
        rotate: open ? 45 : 0,
      }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    />
    <motion.span
      className={BAR}
      initial={false}
      animate={{
        width: open ? LONG : SHORT,
        y: open ? HALF_BAR : HALF_BAR + SPREAD,
        rotate: open ? -45 : 0,
      }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    />
  </span>
)

export const MenuButton = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const conversation = useAgentConversation()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useDismiss(
    open,
    container,
    useCallback(() => setOpen(false), [])
  )

  const agentActive = isAgentRoute(location.pathname)
  const portfolioActive = isPortfolioRoute(location.pathname)
  const marketActive = !agentActive && !portfolioActive

  const openMarket = () => {
    setOpen(false)
    navigate(PATHS.HOME)
  }

  const openAgent = () => {
    setOpen(false)
    if (agentActive) return
    const ticker = location.pathname.match(/^\/(?:token|ticker)\/([^/]+)/)?.[1]
    const decodedTicker = ticker ? decodeURIComponent(ticker) : undefined
    // Switching page carries context, never a question. The conversation and
    // its draft stay exactly as they were.
    navigate(dynamicPaths.agent(), {
      state: decodedTicker
        ? {
            ticker: decodedTicker,
            returnPath: location.pathname,
            requestId: `${decodedTicker}-menu-${Date.now()}`,
          }
        : undefined,
    })
  }

  const openPortfolio = () => {
    setOpen(false)
    navigate(PATHS.PORTFOLIO)
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((value) => !value)}
        className="text-foreground flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-white/5">
        <Bars open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="rounded-10 bg-brown absolute left-0 top-full z-50 mt-1 w-[184px] border border-white/10 py-1 shadow-2xl">
          <Item
            active={marketActive}
            icon={<Coins className="size-3.5" />}
            hint="Tokenized equities"
            onClick={openMarket}>
            Market
          </Item>
          <Item
            active={portfolioActive}
            icon={<BriefcaseBusiness className="size-3.5" />}
            hint="Positions and trade history"
            onClick={openPortfolio}>
            Portfolio
          </Item>
          <Item
            active={agentActive}
            icon={<Bot className="size-3.5" />}
            hint={conversation.assets.length ? 'Conversation open' : 'Ask about a ticker'}
            onClick={openAgent}>
            Agent
          </Item>
        </div>
      )}
    </div>
  )
}

const Item = ({
  active,
  icon,
  hint,
  onClick,
  children,
}: {
  active: boolean
  icon: React.ReactNode
  hint: string
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    role="menuitemradio"
    aria-checked={active}
    onClick={onClick}
    className="text-foreground flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors hover:bg-white/5">
    <span className="text-foreground">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="text-12 block truncate">{children}</span>
      <span className="text-10 text-muted-foreground/70 block truncate">{hint}</span>
    </span>
    {active && <Check className="text-foreground size-3 shrink-0" />}
  </button>
)

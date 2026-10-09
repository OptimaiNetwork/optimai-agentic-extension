import type { ChainId, VenueId } from '@extension/shared'

export const PATHS = {
  HOME: '/',
  PORTFOLIO: '/portfolio',
  TOKEN: '/token/:cashtag',
  /** Legacy path kept so an older open panel can still resolve. */
  TICKER: '/ticker/:cashtag',
  AGENT: '/agent',
  AGENT_TICKER: '/agent/:cashtag',
  ASK: '/ask/:cashtag',
  BUY: '/buy/:cashtag',
}

/**
 * An entry intent, not conversation state.
 *
 * It says which token the user came from so the Agent tab can attach context and
 * offer relevant questions. There is deliberately no `prompt`: arriving at a
 * screen is not a question, and the old field made a panel that wrote one for
 * you the moment you looked at it.
 */
export interface AgentNavigationState {
  ticker?: string
  symbol?: string
  companyName?: string
  returnPath?: string
  requestId?: string
  venue?: VenueId
  chain?: ChainId
}

export interface TokenNavigationState {
  venue?: VenueId
  chain?: ChainId
  /**
   * Prefill for the buy screen, set when the agent's confirmation card opens it.
   *
   * A prefill and nothing more: the screen still fetches its own quote and the
   * user still signs in their wallet. Carried in navigation state rather than
   * the URL so a copied link cannot preload somebody an amount.
   */
  side?: 'buy' | 'sell'
  amount?: string
  /** Where the page's back arrow goes; Market when absent. The portfolio sets itself. */
  returnPath?: string
}

export const dynamicPaths = {
  /** The cashtag is passed through as written — the server does the resolving. */
  ticker: (cashtag: string) => `/token/${encodeURIComponent(cashtag.replace(/^\$/, ''))}`,
  token: (cashtag: string) => `/token/${encodeURIComponent(cashtag.replace(/^\$/, ''))}`,
  agent: () => '/agent',
  portfolio: () => '/portfolio',
  agentTicker: (cashtag: string) => `/agent/${encodeURIComponent(cashtag.replace(/^\$/, ''))}`,
  ask: (cashtag: string) => `/ask/${encodeURIComponent(cashtag.replace(/^\$/, ''))}`,
  buy: (cashtag: string) => `/buy/${encodeURIComponent(cashtag.replace(/^\$/, ''))}`,
}

import { setSelection } from '@x/modules/venue'
import type { ChainId, VenueId } from '@extension/shared'
import { useSyncExternalStore } from 'react'

/** The X panel's width; less on a narrow window, where the panel takes it all. */
export const TRADE_PANEL_WIDTH = 500

/** Whether a point on the window is under the open panel, which is pinned right. */
export const isUnderTradePanel = (clientX: number): boolean =>
  current !== null && clientX >= window.innerWidth - Math.min(TRADE_PANEL_WIDTH, window.innerWidth)

/** The screen the panel shows first: the order form, or the token page behind it. */
export type TradeScreen = 'buy' | 'token'

/** What a card's Trade button knew when it was pressed. */
export interface WebTradeIntent {
  ticker: string
  chain: ChainId
  venue: VenueId
  symbol?: string
  name?: string
  /**
   * Every chain this issuer lists the ticker on, from the lexicon. More than one
   * — Ondo, on Solana and BNB Chain — puts a chain switch in the panel's header.
   */
  chains: readonly ChainId[]
  screen: TradeScreen
  /**
   * Changes on every open and every switch, so the screens start fresh on the
   * new listing. Monotonic: two presses within a millisecond still differ.
   */
  openedAt: number
}

export interface TradeRequest {
  ticker: string
  chain: ChainId
  venue: VenueId
  symbol?: string
  name?: string
  chains?: readonly ChainId[]
  /** The card's View token asks for the token page; its Trade, the order form. */
  screen?: TradeScreen
}

let current: WebTradeIntent | null = null
const listeners = new Set<() => void>()

const emit = () => {
  for (const listener of listeners) listener()
}

const nextOpenedAt = (): number => Math.max(Date.now(), (current?.openedAt ?? 0) + 1)

/**
 * Open the trade panel on a token: on the order form, or on the token page.
 *
 * The buy screen reads its chain and issuer from the shared selection rather
 * than its route, so the selection moves first — which also moves the X panel's
 * remembered selection, the same as choosing it there would.
 */
export const openTradePanel = ({ chains, screen = 'buy', ...request }: TradeRequest): void => {
  setSelection(request.venue, request.chain)
  current = {
    ...request,
    chains: chains?.length ? chains : [request.chain],
    screen,
    openedAt: nextOpenedAt(),
  }
  emit()
}

/**
 * Move the open panel to the same token on another chain, staying on the
 * screen the user was looking at.
 *
 * A remount rather than a navigation: both screens carry their listing in
 * route state, and the token page re-applies it whenever it mounts — so a
 * history entry left on the old chain would switch the selection straight back
 * the moment the user pressed Back.
 */
export const switchTradeChain = (chain: ChainId, screen: TradeScreen): void => {
  if (!current || current.chain === chain || !current.chains.includes(chain)) return
  setSelection(current.venue, chain)
  current = { ...current, chain, screen, openedAt: nextOpenedAt() }
  emit()
}

export const closeTradePanel = (): void => {
  if (!current) return
  current = null
  emit()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useWebTrade = (): WebTradeIntent | null =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  )

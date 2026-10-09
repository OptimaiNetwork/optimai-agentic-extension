import { isChainId, isVenueId } from '@extension/shared'
import { getSelection } from '@x/modules/venue'
import { queryClient } from '@x/queries/client'
import { useCallback, useEffect, useRef, useState } from 'react'

import { listingChains, pickListing } from '../lexicon/listing'
import { BADGE_TAG } from '../scan/badge'
import { HOST_ID } from '../scan/dom'
import { isUnderTradePanel, useWebTrade } from '../trade/store'
import { bridgeBetween, isPointerOver } from './geometry'
import { hoverQuery } from './queries'
import { WebTickerPopover } from './web-ticker-popover'
import type { Lexicon, Listing } from '../services/types'

/** How long the pointer rests on a badge before its card opens. A pass across a paragraph should not flash cards. */
const OPEN_DELAY_MS = 300
/** How long a card survives the pointer leaving, so it can be reached. */
const CLOSE_DELAY_MS = 180
const ACTIVE_CLASS = 'is-active'
const CARD_SELECTOR = '.catalyst-tweet-market-popover'

interface Target {
  ticker: string
  listing: Listing
  trigger: HTMLElement
}

/**
 * The badge an event came from. The pill is in the badge's shadow root, so at
 * the window every event from it is already retargeted to the badge itself.
 */
const badgeOf = (node: EventTarget | null): HTMLElement | null =>
  node instanceof Element ? (node.closest(BADGE_TAG) as HTMLElement | null) : null

/** The listing the badge shows, so its card is about the same token as its pill. */
const listingOf = (badge: HTMLElement, ticker: string, lexicon: Lexicon): Listing | null => {
  const { chain, venue } = badge.dataset
  if (isChainId(chain) && isVenueId(venue)) return { chain, venue }
  return pickListing(ticker, lexicon, getSelection())
}

const cardElement = (): Element | null =>
  document.getElementById(HOST_ID)?.shadowRoot?.querySelector(CARD_SELECTOR) ?? null

/**
 * Opens one card at a time for whichever badge the pointer rests on.
 *
 * Two decisions shape this, both learnt on real Wikipedia:
 *
 * - **Closing follows geometry, not events.** Wikipedia opens its own preview
 *   card over every link, on top of what is under the pointer. By events the
 *   pointer had then left us, and our card shut the moment theirs appeared. The
 *   card now stays while the pointer is over the badge, the card, or the gap.
 * - **The page's own hover does not fire on our badges.** Two cards stacked on
 *   one spot is worse than either, so `mouseover` and `pointerover` that land on
 *   a badge stop with us. Everything else on the page is untouched.
 *
 * One listener set for the whole page rather than one per badge. The card is
 * usually cached already — the badge fetched it for its price — and otherwise
 * is fetched the moment the pointer arrives, so the open delay doubles as a
 * head start on the network. It closes when the trade panel opens.
 */
export const HoverLayer = ({ lexicon }: { lexicon: Lexicon }) => {
  const [target, setTarget] = useState<Target | null>(null)
  const targetRef = useRef<Target | null>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((next: Target | null) => {
    targetRef.current?.trigger.classList.remove(ACTIVE_CLASS)
    next?.trigger.classList.add(ACTIVE_CLASS)
    targetRef.current = next
    setTarget(next)
  }, [])

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])

  const cancelOpen = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current)
    openTimer.current = null
  }, [])

  const closeSoon = useCallback(() => {
    if (closeTimer.current) return
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      show(null)
    }, CLOSE_DELAY_MS)
  }, [show])

  const closeNow = useCallback(() => {
    cancelOpen()
    cancelClose()
    show(null)
  }, [cancelClose, cancelOpen, show])

  // A press on a badge, or on the card's buttons, opens the panel; the card goes.
  const openedAt = useWebTrade()?.openedAt
  useEffect(() => {
    if (openedAt) closeNow()
  }, [closeNow, openedAt])

  useEffect(() => {
    const onOver = (event: Event) => {
      const trigger = badgeOf(event.target)
      if (!trigger) return
      event.stopPropagation()
      if (event.type !== 'pointerover') return
      // A badge the panel covers, or is sliding in over: the pointer stayed put
      // after pressing a card's button, and a second card opened above the panel.
      if (isUnderTradePanel((event as PointerEvent).clientX)) return

      const ticker = trigger.dataset.ticker
      if (!ticker) return
      cancelClose()
      if (targetRef.current?.trigger === trigger) return
      const listing = listingOf(trigger, ticker, lexicon)
      if (!listing) return
      void queryClient.prefetchQuery(hoverQuery(ticker, listing))

      cancelOpen()
      const next = { ticker, listing, trigger }
      // Moving from one open card's badge to the next is instant; only the first waits.
      if (targetRef.current) show(next)
      else openTimer.current = setTimeout(() => show(next), OPEN_DELAY_MS)
    }

    const overCurrent = (event: PointerEvent): boolean => {
      const current = targetRef.current
      if (!current) return false
      const badge = Array.from(current.trigger.getClientRects())
      const card = cardElement()?.getBoundingClientRect() ?? null
      const zones = card
        ? [...badge, bridgeBetween(current.trigger.getBoundingClientRect(), card)]
        : badge
      return isPointerOver(event.clientX, event.clientY, zones, card)
    }

    const onMove = (event: PointerEvent) => {
      if (!targetRef.current) {
        // Resting on a badge, then moving off it before the delay: never open.
        if (openTimer.current && !badgeOf(event.target)) cancelOpen()
        return
      }
      if (overCurrent(event)) cancelClose()
      else closeSoon()
    }

    // A press anywhere else closes the card at once, the way any popover does —
    // and without depending on a move having been reported first.
    const onPress = (event: PointerEvent) => {
      if (targetRef.current && !overCurrent(event)) closeNow()
    }

    const onLeaveWindow = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        cancelOpen()
        if (targetRef.current) closeSoon()
      }
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && targetRef.current) closeNow()
    }

    // Window, capture phase: ahead of any handler the page registered on the
    // document, which is what lets a hover on our badge stop there.
    window.addEventListener('pointerover', onOver, true)
    window.addEventListener('mouseover', onOver, true)
    document.addEventListener('pointermove', onMove, { capture: true, passive: true })
    document.addEventListener('pointerout', onLeaveWindow, true)
    document.addEventListener('pointerdown', onPress, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('pointerover', onOver, true)
      window.removeEventListener('mouseover', onOver, true)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerout', onLeaveWindow, true)
      document.removeEventListener('pointerdown', onPress, true)
      document.removeEventListener('keydown', onKey, true)
      cancelOpen()
      cancelClose()
    }
  }, [cancelClose, cancelOpen, closeNow, closeSoon, lexicon, show])

  if (!target) return null
  return (
    <WebTickerPopover
      key={`${target.ticker}:${target.listing.chain}:${target.listing.venue}`}
      ticker={target.ticker}
      listing={target.listing}
      chains={listingChains(target.ticker, lexicon, target.listing.venue)}
      name={lexicon.names[target.ticker]}
      trigger={target.trigger}
      onPointerEnter={cancelClose}
      onPointerLeave={() => undefined}
      onClose={closeNow}
    />
  )
}

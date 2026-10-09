import { useEffect, useRef, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { cashtagsIn, tweetIdOf, tweetTextOf } from './cashtags'
import { TweetButton } from './tweet-button'
import { resolveLocally, type SupportedTickers } from '@x/queries/catalyst/use-supported-tickers'
import QueryProvider from '@x/providers/query'

const TWEET = 'article[data-testid="tweet"]'
const MOUNT_CLASS = 'catalyst-tweet-button-mount'

/** X recycles article nodes as you scroll, so a mount is only valid while the
 *  node still holds the tweet it was built for. */
interface Mount {
  root: Root
  container: HTMLElement
  tweetId: string | null
  textElement: HTMLElement
  signature: string
  /** Set once torn down, so a node X hands back later cannot unmount it twice. */
  gone: boolean
}

const signatureOf = (tweetId: string | null, tickers: string[]) =>
  `${tweetId ?? '?'}:${tickers.join(',')}`

/**
 * Puts a market pill immediately before the tweet's own copy, and lets both
 * the pill and supported cashtags open the same hover popover.
 *
 * Three things make this harder than it looks, and all three are handled here
 * rather than by re-scanning harder:
 *
 * 1. X virtualises the timeline and reuses article nodes. A flag on the element
 *    is wrong: the node survives while its contents are replaced, so the old
 *    button stays and points at the wrong tweet. The mount is keyed on the node
 *    AND on what that node currently holds.
 * 2. Recycling produces no mutations once scrolling stops, so the observer alone
 *    misses tweets. A slow sweep catches them.
 * 3. React roots have to be unmounted, not just removed from the DOM, or every
 *    scroll leaks one. Scrolling away is the hard case: X detaches the row
 *    outright, and a detached row is invisible to the sweep, so the mount has
 *    to be reaped by looking at what is still connected.
 */
export const useTweetInjection = (supported: SupportedTickers | undefined) => {
  const mounts = useRef(new WeakMap<Element, Mount>()).current
  const supportedRef = useRef(supported)
  supportedRef.current = supported

  useEffect(() => {
    if (!supported?.names.size) return

    let disposed = false
    const live = new Set<Mount>()

    const dispose = (mount: Mount) => {
      if (mount.gone) return
      mount.gone = true
      live.delete(mount)
      // Unmounting synchronously from inside a React lifecycle warns, and this
      // runs from an observer callback, so it is deferred by a tick.
      setTimeout(() => {
        mount.root.unmount()
        mount.container.remove()
      }, 0)
    }

    const drop = (tweet: Element, mount: Mount) => {
      mounts.delete(tweet)
      dispose(mount)
    }

    const sweep = () => {
      if (disposed) return
      const current = supportedRef.current
      if (!current?.names.size) return

      for (const tweet of Array.from(document.querySelectorAll(TWEET))) {
        // Resolved, not filtered: a post saying `$TSLAx` is about TSLA, and the
        // button has to carry the ticker the panel can actually price.
        const tickers = [
          ...new Set(
            cashtagsIn(tweet)
              .map((name) => resolveLocally(name, current))
              .filter((name): name is string => name !== null)
          ),
        ]
        const tweetId = tweetIdOf(tweet)
        const textElement = tweetTextOf(tweet)
        const existing = mounts.get(tweet)
        const signature = signatureOf(tweetId, tickers)

        if (existing) {
          if (
            existing.signature === signature &&
            existing.textElement === textElement &&
            tweet.contains(existing.container)
          ) {
            continue
          }
          drop(tweet, existing)
        }

        // Silence beats an empty panel: a tweet naming nothing we can answer for
        // gets no button at all.
        if (!tickers.length || !textElement?.parentElement) continue

        const container = document.createElement('div')
        container.className = MOUNT_CLASS
        const root = createRoot(container)
        root.render(
          createElement(
            QueryProvider,
            null,
            createElement(TweetButton, { tickers, tweetId, tweet, supported: current })
          )
        )
        textElement.parentElement.insertBefore(container, textElement)

        const mount: Mount = {
          root,
          container,
          tweetId,
          textElement,
          signature,
          gone: false,
        }
        mounts.set(tweet, mount)
        live.add(mount)
      }

      // The loop above can only see rows that are still in the document. A row
      // scrolled out of the viewport is detached, never comes back through
      // `querySelectorAll`, and so is never dropped — while `live` goes on
      // holding its root, its fibre tree and its detached container for the
      // life of the tab. That is one leaked React root per row scrolled past,
      // which on an endless timeline has no ceiling.
      for (const mount of Array.from(live)) {
        if (!mount.container.isConnected) dispose(mount)
      }
    }

    let pending: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (pending) return
      pending = setTimeout(() => {
        pending = null
        sweep()
      }, 120)
    }

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue
          const element = node as Element
          // Ignore our own mounts, or appending a button retriggers the observer
          // that appended it.
          if (element.classList?.contains(MOUNT_CLASS)) continue
          if (element.matches?.(TWEET) || element.querySelector?.(TWEET)) {
            schedule()
            return
          }
        }
      }
    })

    sweep()
    observer.observe(document.querySelector('[data-testid="primaryColumn"]') ?? document.body, {
      childList: true,
      subtree: true,
    })

    // Recycled rows mutate nothing once the scroll settles. Slow on purpose:
    // this is a safety net, not the mechanism.
    const sweeper = setInterval(sweep, 2_000)

    return () => {
      disposed = true
      observer.disconnect()
      clearInterval(sweeper)
      if (pending) clearTimeout(pending)
      for (const mount of Array.from(live)) dispose(mount)
    }
  }, [mounts, supported])
}

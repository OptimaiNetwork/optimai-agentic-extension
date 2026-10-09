import { createElement, useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import QueryProvider from '@x/providers/query'

import { cashtagOfSearch, insertionPointIn } from './anchor'
import { SearchCard } from './card'
import { resolveLocally, type SupportedTickers } from '@x/queries/catalyst/use-supported-tickers'

const MOUNT_ID = 'catalyst-search-card'

interface Mount {
  root: Root
  container: HTMLElement
  ticker: string
}

/**
 * Puts our card below X's on a cashtag search page.
 *
 * Mounted into X's light DOM rather than the panel's shadow root, because it has
 * to sit inside their column and inherit their width. That means it is exposed
 * to X's CSS, which is the trade for looking like it belongs there.
 *
 * `supported` gates it: a cashtag outside the tradable set gets no card at all,
 * the same rule the tweet button follows. An empty card is worse than none.
 */
export const useSearchCard = (supported: SupportedTickers | undefined): void => {
  const mount = useRef<Mount | null>(null)

  useEffect(() => {
    if (!supported?.names.size) return

    let disposed = false

    const teardown = () => {
      const current = mount.current
      if (!current) return
      mount.current = null
      // Deferred: this runs from an observer callback, and unmounting a root
      // synchronously from inside a React lifecycle warns.
      setTimeout(() => {
        current.root.unmount()
        current.container.remove()
      }, 0)
    }

    const sync = () => {
      if (disposed) return

      // `$TSLAx` resolves to TSLA. Without this the card never appeared on the
      // page that motivated it: the one where X shows a Solana mint and nothing
      // corrects it.
      const cashtag = cashtagOfSearch()
      const wanted = cashtag ? resolveLocally(cashtag, supported) : null

      if (!wanted) {
        teardown()
        return
      }

      const existing = mount.current
      if (existing) {
        // Still the right ticker and still attached: leave it alone rather than
        // remounting on every mutation the page makes.
        if (existing.ticker === wanted && existing.container.isConnected) return
        teardown()
      }

      const where = insertionPointIn()
      if (!where) return

      const container = document.createElement('div')
      container.id = MOUNT_ID
      const root = createRoot(container)
      // Its own provider, because this is its own React root. The card is
      // mounted into X's light DOM to inherit their column width, which puts it
      // outside the panel's tree entirely — so it inherits none of the panel's
      // context either. Without this `useQuote` has no client, the component
      // throws, and the container mounts with nothing inside it: the card was
      // silently absent on the real site while its anchor was perfectly placed.
      //
      // The client is a module singleton, so this shares the panel's cache
      // rather than fetching the same quote twice.
      root.render(
        createElement(
          QueryProvider,
          null,
          createElement(SearchCard, { ticker: wanted, cashtag: cashtag ?? undefined })
        )
      )
      where.parent.insertBefore(container, where.before)

      mount.current = { root, container, ticker: wanted }
    }

    let pending: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (pending) return
      pending = setTimeout(() => {
        pending = null
        sync()
      }, 150)
    }

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        // Ignore our own subtree, or rendering the card retriggers the observer
        // that rendered it.
        if (
          record.target instanceof Element &&
          (record.target.id === MOUNT_ID || record.target.closest(`#${MOUNT_ID}`))
        ) {
          continue
        }
        schedule()
        return
      }
    })

    sync()
    observer.observe(document.body, { childList: true, subtree: true })

    // X navigates without a page load, and a pushState fires no event of its
    // own. The observer catches the resulting re-render; this catches the back
    // button, which sometimes changes the URL without changing much else.
    window.addEventListener('popstate', schedule)

    return () => {
      disposed = true
      observer.disconnect()
      window.removeEventListener('popstate', schedule)
      if (pending) clearTimeout(pending)
      teardown()
    }
  }, [supported])
}

import { setSelection } from '@x/modules/venue'
import type { ChainId, VenueId } from '@x/modules/venue'
import { useEffect, useState } from 'react'

/**
 * The issuer a caller arrived with is an entry intent, applied once.
 *
 * It used to be re-applied whenever the selection drifted from it, which meant
 * the issuer switcher could not switch while a ticker page was open: choosing
 * bStocks set the selection, navigated to Market — and this effect, still
 * mounted, put it straight back to the issuer the page had been opened for. The
 * switch looked like it worked, because the route did change.
 *
 * The ticker page is only reachable from a list row or a tweet button, which
 * pass `venue` in the route state; opening one without an intent leaves the
 * current issuer alone.
 *
 * Returns whether the intent has been honoured — not "the selection still
 * equals it", which would leave a page the user has switched away from waiting
 * forever on a venue it is no longer showing.
 */
export const useEntryIntent = (
  cashtag: string,
  intent: { venue?: VenueId; chain?: ChainId }
): boolean => {
  const intentVenue = intent.venue
  const intentChain = intent.chain
  // Keyed by the whole intent so that navigating to a second ticker, or to the
  // same one from a different issuer, is a new intent rather than an applied one.
  const entryIntent = intentVenue ? `${intentVenue}:${intentChain ?? ''}:${cashtag}` : null
  const [appliedIntent, setAppliedIntent] = useState<string | null>(null)

  useEffect(() => {
    if (!intentVenue || !entryIntent || appliedIntent === entryIntent) return
    setSelection(intentVenue, intentChain)
    setAppliedIntent(entryIntent)
  }, [appliedIntent, entryIntent, intentChain, intentVenue])

  return !entryIntent || appliedIntent === entryIntent
}

import { catalystService } from '@x/services/catalyst'
import { useSelection } from '@x/modules/venue'
import type { VenueSelection } from '@x/modules/venue'
import { useQuery } from '@tanstack/react-query'

import { catalystKeys } from './keys'

/**
 * Every market a token trades at, with its price at each one.
 *
 * Refetched on an interval, unlike the pool card this replaced: these are
 * prices, and a price a user is comparing across venues goes stale in a way a
 * reserve figure does not. `active` is what stops the interval when the panel is
 * shut, the same guard the quote uses — the route stays mounted behind a closed
 * panel, and without this it would poll for the life of the tab.
 *
 * The server caches for 60 seconds and dedupes concurrent reads per token, so
 * this interval costs a request only when the cache has actually lapsed. That
 * matters: GeckoTerminal's public tier is 30 calls a minute for everybody.
 */
export const useMarkets = (
  ticker: string | undefined,
  {
    active = true,
    enabled = true,
    selection: requestedSelection,
  }: { active?: boolean; enabled?: boolean; selection?: VenueSelection } = {}
) => {
  const activeSelection = useSelection()
  const selection = requestedSelection ?? activeSelection

  return useQuery({
    queryKey: catalystKeys.markets(selection.venue, selection.chain, ticker ?? ''),
    queryFn: async () => (await catalystService.markets(ticker!, selection)).data,
    enabled: enabled && Boolean(ticker),
    refetchInterval: active ? 60_000 : false,
    staleTime: 30_000,
    // A rate-limited directory is not worth hammering, and the server already
    // serves its last good snapshot while the source is refusing.
    retry: 1,
  })
}

import { catalystService } from '@x/services/catalyst'
import { useSelection } from '@x/modules/venue'
import type { VenueSelection } from '@x/modules/venue'
import { useQuery } from '@tanstack/react-query'

import { catalystKeys } from './keys'

/**
 * Live quote for a ticker.
 *
 * Refetched on an interval because the token trades around the clock — the
 * number goes stale while the panel sits open, including on a weekend when the
 * underlying exchange is shut and X's own card has frozen.
 *
 * `active` is what stops that interval when nobody is looking. The panel is
 * never unmounted, so a route left behind a closed panel kept asking for a
 * fresh price every thirty seconds for the life of the tab.
 */
export const useQuote = (
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
    queryKey: catalystKeys.quote(selection.venue, selection.chain, ticker ?? ''),
    queryFn: async () => (await catalystService.quote(ticker!, selection)).data,
    enabled: enabled && Boolean(ticker),
    refetchInterval: active ? 30_000 : false,
    staleTime: 15_000,
  })
}

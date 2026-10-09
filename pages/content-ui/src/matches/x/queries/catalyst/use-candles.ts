import { catalystService } from '@x/services/catalyst'
import { useSelection } from '@x/modules/venue'
import type { VenueSelection } from '@x/modules/venue'
import { useQuery } from '@tanstack/react-query'

import { catalystKeys } from './keys'

/**
 * Candles, with each hour marked open or shut.
 *
 * Refetched slowly: an hourly series barely moves between requests, and the card
 * sits on a page people leave open.
 */
export const useCandles = (
  ticker: string | undefined,
  interval = '1h',
  limit = 48,
  requestedSelection?: VenueSelection
) => {
  const activeSelection = useSelection()
  const selection = requestedSelection ?? activeSelection

  return useQuery({
    queryKey: catalystKeys.candles(selection.venue, selection.chain, ticker ?? '', interval, limit),
    queryFn: async () => (await catalystService.candles(ticker!, interval, limit, selection)).data,
    enabled: Boolean(ticker),
    staleTime: 5 * 60_000,
  })
}

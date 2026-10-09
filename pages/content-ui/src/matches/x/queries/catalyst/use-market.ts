import { catalystService } from '@x/services/catalyst'
import { useSelection } from '@x/modules/venue'
import { useQuery } from '@tanstack/react-query'

import { catalystKeys } from './keys'

/**
 * Live prices for the Token list. Catalog metadata remains the fast first
 * paint; prices refresh independently and never block the list.
 *
 * The limit covers the whole catalog on purpose. It used to be 20 against a
 * 77-row list, and because the list sorts while the server returned the
 * catalog's own order, the rows that had a price were scattered through the
 * ones that did not.
 */
export const useMarket = (
  query = '',
  limit = 100,
  sort: { key: string; direction: 'asc' | 'desc' } = { key: 'market_cap', direction: 'desc' },
  page = 1
) => {
  const selection = useSelection()

  return useQuery({
    queryKey: catalystKeys.market(
      selection.venue,
      selection.chain,
      query,
      limit,
      sort.key,
      sort.direction,
      page
    ),
    queryFn: async () =>
      (
        await catalystService.market(query, limit, {
          selection,
          sort: sort.key,
          order: sort.direction,
          page,
        })
      ).data,
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  })
}

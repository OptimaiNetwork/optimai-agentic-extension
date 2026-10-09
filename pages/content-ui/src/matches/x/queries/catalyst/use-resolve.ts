import { catalystService } from '@x/services/catalyst'
import { useSelection } from '@x/modules/venue'
import type { VenueSelection } from '@x/modules/venue'
import { useQuery } from '@tanstack/react-query'

import { catalystKeys } from './keys'

/**
 * Maps a cashtag as X wrote it onto the token this product can quote.
 *
 * `selection` overrides the panel's own. The buy screen needs it: Ondo is read
 * on BNB Chain and traded on Solana, and the symbol, decimals and address it
 * shows have to come from the side that will actually be quoted.
 */
export const useResolveCashtag = (
  cashtag: string | undefined,
  options: { enabled?: boolean; selection?: VenueSelection } = {}
) => {
  const active = useSelection()
  const selection = options.selection ?? active

  return useQuery({
    queryKey: catalystKeys.resolve(selection.venue, selection.chain, cashtag ?? ''),
    queryFn: async () => (await catalystService.resolve(cashtag!, selection)).data,
    enabled: Boolean(cashtag) && options.enabled !== false,
    // The catalog barely moves, and a cashtag always means the same company.
    staleTime: 15 * 60_000,
    retry: false,
  })
}

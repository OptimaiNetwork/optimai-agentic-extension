import { catalystService } from '@x/services/catalyst'
import { useSelection } from '@x/modules/venue'
import { useQuery } from '@tanstack/react-query'

import { catalystKeys } from './keys'
import type { SupportedTickers } from './use-supported-tickers'

/**
 * Everything the product can answer for, as one lookup.
 *
 * Deciding whether a cashtag deserves a button happens inside a MutationObserver
 * that fires on every scroll, so it has to cost nothing per tweet — this is
 * fetched once and held.
 *
 * It does not come from the catalog. The catalog is paged, and it was being
 * asked for one page: on bStocks that is all 77 tokens and nobody noticed, on
 * Ondo it is 100 of 442 and the other 342 cashtags got nothing — on exactly the
 * posts this product exists to correct. Reading every page instead would work
 * and cost megabytes, because each row carries its logo as an inline data URI.
 * `/stocks/names` is the same answer in 14kB.
 *
 * The aliases matter more than they look. X writes what the poster wrote, so a
 * post about Tesla says `$TSLAx` while the only token with a market is TSLAB.
 */
export const useTradableNames = () => {
  const selection = useSelection()

  return useQuery({
    queryKey: [...catalystKeys.all, selection.venue, selection.chain, 'names'],
    queryFn: async (): Promise<SupportedTickers> => {
      const { data } = await catalystService.names(selection)

      const names = new Set(data.names.map((name) => name.toUpperCase()))
      const aliases = new Map<string, string>()
      for (const [symbol, ticker] of Object.entries(data.aliases ?? {})) {
        names.add(symbol.toUpperCase())
        aliases.set(symbol.toUpperCase(), ticker.toUpperCase())
      }

      // The list has its own query; nothing here needs the tokens themselves.
      return { names, aliases, tokens: [], total: data.total }
    },
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  })
}

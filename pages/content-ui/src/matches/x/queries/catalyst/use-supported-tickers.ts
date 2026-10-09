import { catalystService } from '@x/services/catalyst'
import { useSelection } from '@x/modules/venue'
import type { StockToken } from '@x/services/catalyst'
import { useQuery } from '@tanstack/react-query'

import { catalystKeys } from './keys'

export interface SupportedTickers {
  /** Every name that should get a button: tickers plus every issuer's symbol. */
  names: Set<string>
  /** Symbol to the ticker it means. NVDAX and NVDAON both point at NVDA. */
  aliases: Map<string, string>
  /** The tradable catalog itself, ticker-sorted, for anything that lists it. */
  tokens: StockToken[]
  /** How many the venue has in all, not how many this page holds. */
  total?: number
  hasMore?: boolean
}

/**
 * Everything the product can answer for, as one lookup.
 *
 * Fetched once and held, so deciding whether a cashtag deserves a button costs
 * nothing per tweet — a network call inside a MutationObserver that fires on
 * every scroll would be a denial of service against our own backend.
 *
 * The aliases matter more than they look. X writes what the poster wrote, so a
 * post about Tesla says `$TSLAx` while the only token with a market is TSLAB.
 * Gating on the tradable names alone rendered nothing at all on exactly the
 * cashtags this product exists to correct.
 */
export const useSupportedTickers = (query = '', page = 1) => {
  const selection = useSelection()

  return useQuery({
    queryKey: [...catalystKeys.all, selection.venue, selection.chain, 'supported', query, page],
    queryFn: async (): Promise<SupportedTickers> => {
      const { data } = await catalystService.list(query, 100, selection, page)

      const names = new Set<string>()
      const aliases = new Map<string, string>()

      for (const token of data.items) {
        names.add(token.ticker.toUpperCase())
        names.add(token.symbol.toUpperCase())
        aliases.set(token.symbol.toUpperCase(), token.ticker.toUpperCase())
      }
      for (const [symbol, ticker] of Object.entries(data.aliases ?? {})) {
        names.add(symbol.toUpperCase())
        aliases.set(symbol.toUpperCase(), ticker.toUpperCase())
      }

      const tokens = [...data.items].sort((a, b) => a.ticker.localeCompare(b.ticker))

      return { names, aliases, tokens, total: data.total, hasMore: data.has_more }
    },
    staleTime: query ? 30_000 : 30 * 60_000,
    gcTime: 60 * 60_000,
  })
}

/** The ticker a cashtag means, or null when it is not one of ours. */
export const resolveLocally = (
  cashtag: string,
  supported: SupportedTickers | undefined
): string | null => {
  if (!supported) return null
  const name = cashtag.replace(/^\$/, '').toUpperCase()
  if (!name) return null
  return supported.aliases.get(name) ?? (supported.names.has(name) ? name : null)
}

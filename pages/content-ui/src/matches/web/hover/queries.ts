import { useQuery } from '@tanstack/react-query'

import { pageService } from '../services'
import type { HoverCard, Listing } from '../services/types'

/** A price on a card that stays open is refreshed on this clock. */
const REFRESH_MS = 30_000
/** Hovering the same word twice within this is instant and costs nothing. */
const STALE_MS = 30_000

export const hoverKey = (ticker: string, listing: Listing) =>
  ['catalyst', 'hover', listing.chain, listing.venue, ticker] as const

export const hoverQuery = (ticker: string, listing: Listing) => ({
  queryKey: hoverKey(ticker, listing),
  queryFn: async (): Promise<HoverCard> => (await pageService.hover(ticker, listing)).data,
  staleTime: STALE_MS,
  // One retry: a cold card upstream can time out once and succeed at once after.
  retry: 1,
  retryDelay: 1_000,
})

export const useHoverCard = (ticker: string, listing: Listing, open: boolean) =>
  useQuery({ ...hoverQuery(ticker, listing), refetchInterval: open ? REFRESH_MS : false })

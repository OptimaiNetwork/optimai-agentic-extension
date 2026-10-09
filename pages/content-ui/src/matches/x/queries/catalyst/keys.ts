import type { ChainId, VenueId } from '@extension/shared'

export const catalystKeys = {
  all: ['catalyst'] as const,
  resolve: (venue: VenueId, chain: ChainId, cashtag: string) =>
    [...catalystKeys.all, venue, chain, 'resolve', cashtag] as const,
  quote: (venue: VenueId, chain: ChainId, ticker: string) =>
    [...catalystKeys.all, venue, chain, 'quote', ticker] as const,
  market: (
    venue: VenueId,
    chain: ChainId,
    query: string,
    limit: number,
    sort = 'market_cap',
    order = 'desc',
    page = 1
  ) => [...catalystKeys.all, venue, chain, 'market', query, limit, sort, order, page] as const,
  // `limit` is part of the key: the search card asks for 96 hours and the ticker
  // page for 24, and without it whichever loaded first answered for both.
  candles: (venue: VenueId, chain: ChainId, ticker: string, interval: string, limit: number) =>
    [...catalystKeys.all, venue, chain, 'candles', ticker, interval, limit] as const,
  markets: (venue: VenueId, chain: ChainId, ticker: string) =>
    [...catalystKeys.all, venue, chain, 'markets', ticker] as const,
  // One portfolio per set of connected wallets: connecting the second address
  // is a different portfolio, not a refresh of the first.
  portfolio: (wallets: Partial<Record<ChainId, string>>) =>
    [...catalystKeys.all, 'portfolio', wallets.bnb ?? '', wallets.solana ?? ''] as const,
  portfolioStats: (wallets: Partial<Record<ChainId, string>>) =>
    [...catalystKeys.portfolio(wallets), 'stats'] as const,
  portfolioTrades: (wallets: Partial<Record<ChainId, string>>, page: number, pageSize: number) =>
    [...catalystKeys.portfolio(wallets), 'trades', page, pageSize] as const,
  portfolioHistory: (wallets: Partial<Record<ChainId, string>>, window: string) =>
    [...catalystKeys.portfolio(wallets), 'history', window] as const,
}

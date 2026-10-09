import catalystClient from '@x/libs/catalyst'

import type {
  Brief,
  BriefPost,
  FollowUp,
  FollowUpTurn,
  MarketsSnapshot,
  TradeQuote,
  CandleSeries,
  StockListResponse,
  StockMarketResponse,
  StockQuote,
  StockToken,
  TradableNames,
  TradeSide,
  TradeVenue,
  TransactionReceipt,
  PortfolioChain,
  PortfolioTradeInput,
  PortfolioTrade,
  PortfolioTradesPage,
  PortfolioStats,
  PortfolioHistory,
  PortfolioHistoryWindow,
  PortfolioWallets,
  VenueSelection,
  WalletBalance,
} from './types'

export const catalystService = {
  /** One server-ranked page of the selected issuer's catalog. */
  list(query = '', limit = 100, selection?: VenueSelection, page = 1) {
    return catalystClient.get<StockListResponse>('/stocks', {
      params: { q: query, page, page_size: limit },
      selection,
    })
  },

  /** Which cashtags are ours, for the whole venue and in one small response. */
  names(selection?: VenueSelection) {
    return catalystClient.get<TradableNames>('/stocks/names', { selection })
  },

  market(
    query = '',
    limit = 100,
    options?: { page?: number; sort?: string; order?: string; selection?: VenueSelection }
  ) {
    return catalystClient.get<StockMarketResponse>('/stocks/market', {
      params: {
        q: query,
        page: options?.page ?? 1,
        page_size: limit,
        sort: options?.sort ?? 'market_cap',
        order: options?.order ?? 'desc',
      },
      selection: options?.selection,
    })
  },

  /** Any issuer's name for a company resolves to the one token with a market. */
  resolve(cashtag: string, selection?: VenueSelection) {
    return catalystClient.get<StockToken>('/stocks/resolve', { params: { cashtag }, selection })
  },

  quote(ticker: string, selection?: VenueSelection) {
    return catalystClient.get<StockQuote>(`/stocks/${encodeURIComponent(ticker)}`, { selection })
  },

  /**
   * Every market this token trades at, with its price at each one.
   *
   * Reference prices, not executable ones: what a trade actually fills at comes
   * from the quote step, which routes across these and may not use any of them.
   * The path keeps its old name because it is already in the background's
   * allowlist and in four server mounts.
   */
  markets(ticker: string, selection?: VenueSelection) {
    return catalystClient.get<MarketsSnapshot>(`/stocks/${encodeURIComponent(ticker)}/pools`, {
      selection,
    })
  },

  /**
   * Hand the server what was read off X and get back a written read.
   *
   * The posts travel from here rather than being fetched there: they were
   * already on their way to the page, so nothing in this round trip costs X a
   * request.
   */
  brief(ticker: string, posts: BriefPost[]) {
    return catalystClient.post<Brief>('/catalyst/brief', { ticker, posts })
  },

  /**
   * What buying this would look like, and the transaction that would do it.
   *
   * The server talks to the selected route; the transaction that comes back is
   * unsigned and only the user's wallet can finish it.
   */
  /** What the connected wallet can actually spend, before an amount is typed. */
  tradeBalance(wallet: string, payToken: string, selection?: VenueSelection) {
    return catalystClient.get<WalletBalance>('/trade/balance', {
      params: { wallet, pay_token: payToken },
      selection,
    })
  },

  tradeQuote(
    input: {
      ticker: string
      venue: TradeVenue
      side?: TradeSide
      pay_token: string
      pay_amount: string
      wallet: string
      slippage_percent?: string
    },
    selection?: VenueSelection
  ) {
    return catalystClient.post<TradeQuote>('/trade/quote', input, { selection })
  },

  /**
   * Whether a BNB Chain swap actually landed.
   *
   * MetaMask returns a hash the moment a transaction is broadcast, and a swap
   * that reverts a block later keeps it. The panel used to open its success
   * screen on the hash; it now waits for this.
   */
  tradeReceipt(hash: string, selection?: VenueSelection) {
    return catalystClient.get<TransactionReceipt>('/trade/receipt', {
      params: { hash },
      selection,
    })
  },

  recordPortfolioTrade(chain: PortfolioChain, wallet: string, input: PortfolioTradeInput) {
    return catalystClient.post<PortfolioTrade>(
      `/portfolio/${chain}/${encodeURIComponent(wallet)}/trades`,
      input
    )
  },

  /** Every connected wallet's trades in one list; the server sorts across chains. */
  portfolioTrades(wallets: PortfolioWallets, page = 1, pageSize = 20) {
    return catalystClient.get<PortfolioTradesPage>('/portfolio/trades', {
      params: { bnb: wallets.bnb, solana: wallets.solana, page, page_size: pageSize },
    })
  },

  /** One P&L across every connected wallet, computed by the server. */
  portfolioStats(wallets: PortfolioWallets) {
    return catalystClient.get<PortfolioStats>('/portfolio/stats', {
      params: { bnb: wallets.bnb, solana: wallets.solana },
    })
  },

  /** Total P&L over the last 24 hours, 7 or 30 days, ending on the stats total. */
  portfolioHistory(wallets: PortfolioWallets, window: PortfolioHistoryWindow) {
    return catalystClient.get<PortfolioHistory>('/portfolio/history', {
      params: { bnb: wallets.bnb, solana: wallets.solana, window },
    })
  },

  /**
   * Hand back a signed Solana transaction for Jupiter to broadcast.
   *
   * There is no BSC counterpart: MetaMask broadcasts an EVM transaction itself
   * and returns a hash, while a Solana signature comes back to us and Jupiter's
   * Ultra API sends it. The key never leaves the wallet either way.
   */
  tradeExecute(
    input: { signed_transaction: string; request_id: string },
    selection?: VenueSelection
  ) {
    return catalystClient.post<{ status?: string; signature?: string; error?: string }>(
      '/trade/execute',
      input,
      {
        selection,
      }
    )
  },

  candles(ticker: string, interval = '1h', limit = 60, selection?: VenueSelection) {
    return catalystClient.get<CandleSeries>(`/stocks/${encodeURIComponent(ticker)}/candles`, {
      params: { interval, limit },
      selection,
    })
  },

  /**
   * One more question about a brief already written.
   *
   * The whole conversation goes back up every time because the server keeps
   * none of it: the panel is the only place it lives, and it goes with the tab.
   */
  followUp(body: {
    ticker: string
    brief: Brief
    posts: BriefPost[]
    history: FollowUpTurn[]
    question: string
  }) {
    return catalystClient.post<FollowUp>('/catalyst/follow-up', body)
  },
}

export type * from './types'

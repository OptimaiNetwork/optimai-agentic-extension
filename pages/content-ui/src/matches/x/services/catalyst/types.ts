import type { ChainId, VenueId } from '@extension/shared'

export type Provider = 'ondo' | 'xstock' | 'bstock' | 'preipo' | 'prestocks'

export interface VenueSelection {
  venue: VenueId
  chain: ChainId
}

/** How, and whether, a token can actually be bought on BSC. */
export type Tradability = 'swap' | 'rfq' | 'unavailable'

export interface TradeCapability {
  status: 'available' | 'unavailable' | 'unknown'
  reason_code?: string | null
  reason?: string | null
  execution_mode?: string | null
  checked_at?: string | null
}

export interface StockToken {
  symbol: string
  ticker: string
  contract_address: string
  chain_id: string
  provider: Provider
  multiplier: string
  decimals: number
  /** Company name, e.g. "NVIDIA (bStocks)". Null until the server resolves it. */
  name: string | null
  /**
   * A 64px WebP as a `data:` URI, not a link.
   *
   * x.com's CSP lists `data:` under `img-src` and does not list the issuer's
   * CDN, and the panel renders inside the x.com document — an `<img>` pointed
   * at `onchainos.bnbstatic.com` is blocked outright. Null until resolved, and
   * possibly forever, so every consumer needs a fallback.
   */
  logo: string | null
  issuer?: VenueId
  chain?: ChainId
  mint?: string
  underlying_name?: string | null
  company_market_cap?: string | null
  token_price?: string | null
  session?: MarketStatus | null
}

export interface MarketStatus {
  status: string
  is_open: boolean
  reason_code: string | null
  next_open_at: string | null
  next_close_at: string | null
}

export interface PriceDivergence {
  /** Raw on-chain price of one token. */
  token_price: string
  /** token_price divided by the multiplier — the number to compare. */
  reference_price: string
  stock_price: string
  absolute: string
  percent: string
}

export interface ShareFundamentals {
  week52_high: string | null
  week52_low: string | null
  /** Null for a company with no earnings. Null is not zero. */
  price_to_earnings: string | null
  /** Already normalised to percent by the server; the issuers disagree by 100x. */
  dividend_yield_percent: string | null
  price_to_book: string | null
  market_cap: string | null
  volume: string | null
  /** Published by bStocks and by nobody else, so present for every tradable token. */
  eps: string | null
  return_on_equity_percent: string | null
  return_on_assets_percent: string | null
  free_cash_flow: string | null
  /** Negative when EBITDA is negative. Not an error. */
  ev_to_ebitda: string | null
  price_to_sales: string | null
  /** A ratio, not a percent. IBM reads 1.80. */
  debt_to_equity: string | null
}

export interface CompanyProfile {
  name: string | null
  description: string | null
  ceo: string | null
  industry: string | null
  homepage_url: string | null
}

export interface StockQuote {
  symbol: string
  ticker: string
  contract_address: string
  provider: Provider
  tradability: Tradability
  trade_capability?: TradeCapability | null
  multiplier: string
  reference_price: string
  /** Absent when no issuer on BSC publishes a share price for this ticker. */
  divergence: PriceDivergence | null
  stock_price_source: Provider | null
  market: MarketStatus
  price_change_pct_24h: string | null
  /** Holders of this token on Binance. bStocks publishes no on-chain count. */
  binance_holders: number | null
  binance_traders: number | null
  /**
   * The same three the Token list carries. Supply is read off the contract and
   * volume is summed from this token's own candles, because the API's
   * `marketCap` is null for every bStock and its `volume24h` is the underlying
   * share's on its exchange.
   */
  volume_24h: string | null
  market_cap: string | null
  total_supply: string | null
  /** The company's numbers, not the token's. Absent when the issuer sends none. */
  fundamentals: ShareFundamentals | null
  fetched_at: string
  issuer?: VenueId
  chain?: ChainId
  mint?: string
  underlying_name?: string | null
  company_market_cap?: string | null
  token_price?: string | null
  volume_is_amm_only?: boolean
}

export interface Candle {
  open_time: string
  open: string
  high: string
  low: string
  close: string
  volume: string
  /** Whether the US exchange was in its regular session for this hour. */
  session: 'regular' | 'closed'
}

export interface CandleSeries {
  symbol: string
  ticker: string
  interval: string
  candles: Candle[]
  market: MarketStatus
  chain?: ChainId
  mint?: string
  source?: string
}

/**
 * Every name a cashtag could be, for the whole venue.
 *
 * Separate from the catalog because it answers a different question, and
 * because the catalog cannot answer it affordably: its rows carry logos as
 * inline data URIs, so reading all 442 Ondo tokens to gate a cashtag costs
 * megabytes for a set of short strings. This is 14kB.
 */
export interface TradableNames {
  total: number
  names: string[]
  aliases: Record<string, string>
}

export interface StockListResponse {
  total: number
  items: StockToken[]
  /**
   * Every other issuer's symbol for a ticker we carry, mapped to that ticker.
   * NVDAX and NVDAON both point at NVDA. Sent with the list so a client can
   * decide whether a cashtag is one of ours without a call per cashtag.
   */
  aliases: Record<string, string>
  page?: number
  page_size?: number
  has_more?: boolean
  issuer?: VenueId
  chain?: ChainId
}

export interface StockMarketItem {
  symbol: string
  ticker: string
  provider: Provider
  multiplier: string
  reference_price: string | null
  price_change_pct_24h: string | null
  /**
   * The token's own numbers on BSC, both computed by the server.
   *
   * `tokenInfo.volume24h` from the API is not this: it equals
   * `stockInfo.volume * stockInfo.price`, the underlying share's dollar volume
   * on its own exchange. NVDAB reads $25.1B there against $2.08M that actually
   * traded on BSC. This is summed from the token's own candles.
   */
  volume_24h: string | null
  /** `totalSupply()` off the contract times the token price. */
  market_cap: string | null
  total_supply: string | null
  /**
   * Twenty-four hourly closes, oldest first, already divided by the multiplier.
   *
   * The same candles the volume is summed from, so the line costs no request
   * the list was not already making.
   */
  sparkline: string[] | null
  fetched_at: string | null
  error: string | null
  issuer?: VenueId
  chain?: ChainId
  mint?: string
  underlying_name?: string | null
  company_market_cap?: string | null
  token_price?: string | null
  market_price_usd?: string | null
  liquidity_usd?: string | null
  quote_status?: string
  volume_is_amm_only?: boolean
}

/**
 * What the whole venue is worth — not this page, and not this search.
 *
 * The panel used to add up the rows it had been sent, so typing a ticker
 * redefined "market cap" as that one company's. `priced` against `total` is
 * part of the answer: a sum over 438 of 442 tokens is a different claim from a
 * sum over all of them.
 */
export interface MarketTotals {
  market_cap: string | null
  /** Absent where a venue has no on-chain day to sum — Ondo settles by RFQ. */
  volume_24h: string | null
  priced: number
  total: number
}

export interface StockMarketResponse {
  total: number
  items: StockMarketItem[]
  market: MarketStatus
  fetched_at: string
  page?: number
  page_size?: number
  has_more?: boolean
  totals?: MarketTotals
  issuer?: VenueId
  chain?: ChainId
}

export interface BriefPost {
  id: string
  url: string
  text: string
  created_at?: string
  author: { handle: string; name: string; followers?: number; verified: boolean }
  tickers: string[]
  metrics: { replies?: number; reposts?: number; likes?: number; quotes?: number; views?: number }
}

export interface Brief {
  ticker: string
  headline: string
  what_happened: string
  why_it_matters: string
  price_context: string
  caveats: string[]
  sources: string[]
  model: string
  posts_seen: number
  posts_used: number
  generated_at: string
}

export interface UnsignedTransaction {
  to: string
  data: string
  value: string
  gas?: string | null
  gas_price?: string | null
  max_priority_fee_per_gas?: string | null
}

export interface ApprovalNeeded {
  to: string
  data: string
  spender: string
}

/**
 * Routes the panel is allowed to submit now.
 *
 * `bnbchain` is intentionally absent: the old Binance RFQ route remains in
 * the backend as a rollback seam, but it is not a user-selectable route.
 */
export type TradeVenue = 'pancakeswap' | 'jupiter'
export type QuoteVenue = TradeVenue | 'bnbchain'
/** BUY spends the settlement token for the stock token; SELL is the reverse. */
export type TradeSide = 'buy' | 'sell'

/**
 * What a Solana quote hands the wallet instead of an EVM transaction.
 *
 * Base64 rather than `{to, data, value}`, and it comes back here to be executed
 * rather than being broadcast by the wallet.
 */
export interface SolanaUnsignedTransaction {
  chain: 'solana'
  serialized_transaction: string
  request_id: string | null
}

export interface TradeQuote {
  venue: QuoteVenue
  /** Absent from quotes written before selling existed, which were all buys. */
  side?: TradeSide
  ticker: string
  symbol: string
  /** The settlement token, whichever side the trade is. */
  pay_token: string
  /** Exact input: settlement token on BUY, stock token on SELL. */
  pay_amount: string
  /** Output: stock token on BUY, settlement token on SELL. */
  receive_amount: string
  /** Settlement token per one stock token, on both sides. */
  price_per_token: string
  price_impact_percent: string | null
  minimum_received: string | null
  slippage_percent: string
  route: string
  vendor: string | null
  execution_mode: string
  quote_id: string
  /** The selected venue's short-lived quote expiry. */
  expires_at: string
  approval: ApprovalNeeded | null
  // One field, two chains. EVM gives the wallet something to send; Solana gives
  // it something to sign and hands the signature back for Jupiter to broadcast.
  transaction: UnsignedTransaction | SolanaUnsignedTransaction | null
  /**
   * Why there is a price but nothing to sign.
   *
   * Solana only: Jupiter builds the transaction only when the taker can pay, so
   * a wallet without the funds gets a real quote and no transaction. Saying so
   * is the difference between an explained refusal and a dead button.
   */
  unsignable_reason?: string | null
  source: string
}

export interface FollowUpTurn {
  question: string
  answer: string
}

export interface FollowUp {
  answer: string
  sources: string[]
  model: string
  answered_at: string
}

/** What one wallet holds of one payment token, on one chain. */
export interface WalletBalance {
  chain: string
  token: string
  amount: string
  /** Null when the balance could not be priced — a different claim from zero. */
  usd: string | null
  /** What one unit is worth. Present even when the wallet holds nothing. */
  price_usd: string | null
}

/** Whether a broadcast BNB Chain transaction landed. A hash alone is not a fill. */
export interface TransactionReceipt {
  hash: string
  status: 'pending' | 'success' | 'reverted'
  block_number: number | null
  /** The contract's own revert reason, when the node could replay the call. */
  reason?: string | null
}

export type PortfolioChain = 'bnb' | 'solana'
export type PortfolioVenue = 'bstock' | 'ondo' | 'prestock'

export interface PortfolioTradeInput {
  transaction_id: string
  venue: PortfolioVenue
  ticker: string
  token_address: string
  quote_asset: string
}

export interface PortfolioTrade {
  chain: PortfolioChain
  wallet: string
  transaction_id: string
  venue: PortfolioVenue
  side: TradeSide
  ticker: string
  token_address: string
  token_amount: string
  quote_asset: string
  quote_amount: string
  fee_amount: string
  price_per_token: string
  executed_at: string
  created_at: string
  source: 'chain_verified'
}

/** The addresses one portfolio covers: whichever of the two are connected. */
export type PortfolioWallets = Partial<Record<PortfolioChain, string>>

export interface PortfolioWallet {
  chain: PortfolioChain
  wallet: string
}

/** Every wallet's trades, newest execution first across chains. */
export interface PortfolioTradesPage {
  wallets: PortfolioWallet[]
  total: number
  page: number
  page_size: number
  items: PortfolioTrade[]
  /** Token logos as `data:` URIs, keyed `"<chain>:<token_address>"`. */
  logos: Record<string, string>
}

/** An open position; the same stock on two chains is two positions. */
export interface PortfolioPosition {
  chain: PortfolioChain
  venue: PortfolioVenue
  ticker: string
  token_address: string
  quantity: string
  cost_basis: string
  average_entry_price: string
  current_price: string | null
  market_value: string | null
  unrealized_pnl: string | null
  unrealized_pnl_percent: string | null
  price_source: string | null
  /** Share of the priced book's market value; null while unpriced. */
  weight_percent: string | null
  logo: string | null
  /** The company the token tracks ("Microsoft" for MSFTon), when the catalog names it. */
  name?: string | null
}

export interface PortfolioChainAllocation {
  chain: PortfolioChain
  market_value: string
  weight_percent: string
}

/** One USD P&L across every wallet, computed by the server. */
export interface PortfolioStats {
  wallets: PortfolioWallet[]
  quote_asset: 'USD'
  trade_count: number
  buy_count: number
  sell_count: number
  matched_sell_count: number
  winning_sell_count: number
  win_rate_percent: string | null
  pnl_complete: boolean
  buy_volume: string
  sell_volume: string
  fees: string
  realized_pnl: string
  unrealized_pnl: string
  total_pnl: string
  cost_basis: string
  market_value: string
  open_position_count: number
  priced_position_count: number
  positions: PortfolioPosition[]
  chain_allocation: PortfolioChainAllocation[]
}

export type PortfolioHistoryWindow = '24h' | '7d' | '30d'

/** The book at one moment: what was held then, at that moment's price. */
export interface PortfolioHistoryPoint {
  at: string
  total_pnl: string
  realized_pnl: string
  unrealized_pnl: string
  market_value: string
  cost_basis: string
}

/**
 * Total P&L over a window (24h, 7d or 30d), rebuilt by the server from the recorded trades and
 * past prices. It starts at the first trade when that is later than the window,
 * and its last point is the `total_pnl` that `/portfolio/stats` reports.
 */
export interface PortfolioHistory {
  wallets: PortfolioWallet[]
  window: PortfolioHistoryWindow
  interval: string
  points: PortfolioHistoryPoint[]
  /** Tickers drawn at their last trade price because past prices were unreadable. */
  unpriced: string[]
}

/**
 * One market a token trades at, described from that token's side.
 *
 * `price_usd` is what one of the requested token is worth **at this market**.
 * Two rows for the same token routinely disagree, which is the reason the table
 * exists; nothing here is ever a price borrowed from the ticker.
 */
export interface MarketRow {
  id: string
  dex_id: string
  venue: string
  pair: string
  token_address: string
  quote_address: string | null
  quote_symbol: string
  address: string
  url: string | null
  price_usd: string | null
  /** Null is not zero. An order book has no reserve either source reports. */
  liquidity_usd: string | null
  volume_24h_usd: string | null
}

export interface MarketsSnapshot {
  ticker: string
  symbol: string
  chain: 'bnb' | 'solana'
  token_address: string
  source: 'dexscreener' | 'geckoterminal'
  /** Null when no read has ever succeeded, so a timestamp is never invented. */
  fetched_at: string | null
  source_updated_at: string | null
  /** Neither directory states a total, so `complete` is not claimed today. */
  coverage: 'complete' | 'partial' | 'unknown'
  returned_count: number
  markets: MarketRow[]
  /**
   * Venue marks as data URIs, keyed by `dex_id`, one per brand rather than one
   * per row. A venue with no confirmed mark is simply absent.
   */
  logos: Record<string, string>
  invalid_row_count: number
  /** An older snapshot is being shown because the latest read failed. */
  stale: boolean
  /** The read failed and nothing older exists. Not the same as no markets. */
  unavailable_reason: string | null
}

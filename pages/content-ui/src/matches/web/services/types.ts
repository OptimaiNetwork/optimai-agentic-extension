import type { Candle, MarketStatus } from '@x/services/catalyst'
import type { ChainId, VenueId } from '@extension/shared'

/** Mirrors `optimai-agentic-server/src/app/lexicon/schemas.py`. */
export type TermKind = 'ticker' | 'symbol' | 'name' | 'alias'
export type TermCase = 'exact' | 'capitalized'

export interface LexiconTerm {
  term: string
  ticker: string
  kind: TermKind
  case: TermCase
  needs_context: boolean
}

export interface LexiconListing {
  chain: ChainId
  venue: VenueId | 'xstock'
  symbol: string
  address: string
  quotable: boolean
}

export interface Lexicon {
  version: string
  generated_at: string
  terms: LexiconTerm[]
  tokens: Record<string, LexiconListing[]>
  names: Record<string, string>
}

export interface LexiconVersion {
  version: string
  generated_at: string
  terms: number
}

/** The listing a card is read from: one of the four the panel can select. */
export interface Listing {
  chain: ChainId
  venue: VenueId
}

/** Mirrors `optimai-agentic-server/src/app/hover/schemas.py`. Numbers are strings, as everywhere. */
export interface HoverToken {
  ticker: string
  symbol: string
  name: string | null
  logo: string | null
  address: string
  chain: ChainId
  venue: VenueId
  chain_label: string
  venue_label: string
}

export interface HoverQuote {
  reference_price: string | null
  token_price: string | null
  multiplier: string | null
  price_change_pct_24h: string | null
  volume_24h: string | null
  market_cap: string | null
  holders: number | null
  tradability: string | null
  trade_capability: { status: string; reason?: string | null } | null
}

export interface HoverCard {
  ticker: string
  chain: ChainId
  venue: VenueId
  token: HoverToken
  quote: HoverQuote
  market: MarketStatus | null
  candles: Candle[]
  candle_interval: string
  other_listings: LexiconListing[]
  unavailable: Record<string, string>
  fetched_at: string
  stale: boolean
}

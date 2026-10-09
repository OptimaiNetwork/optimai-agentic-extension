export const BASE_API_URL = process.env.CEB_BASE_API_URL || 'https://api.optimai.im'
export const XAGENT_URL = process.env.CEB_XAGENT_URL || 'https://app.optimai.im'

/**
 * The Catalyst backend. Keyed Binance credentials live there and never reach the
 * extension, so every tokenized-stock read goes through it.
 */
export const CATALYST_API_URL =
  process.env.CEB_CATALYST_API_URL || 'https://agentic-api.optimai.network'

/**
 * Which chain the panel is reading, and where that chain's routes live.
 *
 * Both chains share one API origin. Individual listing descriptors below map
 * each issuer/chain pair to its mounted route prefix.
 */
export const CHAIN_IDS = ['solana', 'bnb'] as const

export type ChainId = (typeof CHAIN_IDS)[number]

export interface ChainDescriptor {
  id: ChainId
  /** What the switcher shows. */
  label: string
  /** Prepended to every request path. Empty for the chain mounted at the root. */
  pathPrefix: string
  /** The unit a wallet pays with on this chain. */
  payToken: string
}

export const CHAINS: Record<ChainId, ChainDescriptor> = {
  bnb: { id: 'bnb', label: 'BNB Chain', pathPrefix: '', payToken: 'USDT' },
  solana: { id: 'solana', label: 'Solana', pathPrefix: '/solana', payToken: 'USDC' },
}

export const DEFAULT_CHAIN: ChainId = 'solana'

export const isChainId = (value: unknown): value is ChainId =>
  typeof value === 'string' && (CHAIN_IDS as readonly string[]).includes(value)

export const VENUE_IDS = ['bstock', 'ondo', 'prestock'] as const
export type VenueId = (typeof VENUE_IDS)[number]

/** The issuers available on each chain, in the order shown by the venue menu. */
export const VENUE_LISTINGS: Record<ChainId, readonly VenueId[]> = {
  bnb: ['bstock', 'ondo'],
  solana: ['ondo', 'prestock'],
}

export interface VenueDescriptor {
  id: VenueId
  label: string
  chain: ChainId
  pathPrefix: string
  payToken: string
  wallet: 'evm' | 'svm'
}

type VenueListingDescriptor = Omit<VenueDescriptor, 'id' | 'label'>

/** Route and wallet metadata for each valid issuer/chain combination. */
export const VENUE_LISTING_DESCRIPTORS: Record<
  ChainId,
  Partial<Record<VenueId, VenueListingDescriptor>>
> = {
  bnb: {
    bstock: { chain: 'bnb', pathPrefix: '', payToken: 'USDT', wallet: 'evm' },
    ondo: { chain: 'bnb', pathPrefix: '/ondo', payToken: 'USDT', wallet: 'evm' },
  },
  solana: {
    ondo: { chain: 'solana', pathPrefix: '/solana/ondo', payToken: 'USDC', wallet: 'svm' },
    prestock: { chain: 'solana', pathPrefix: '/solana', payToken: 'USDC', wallet: 'svm' },
  },
}

export const DEFAULT_VENUE_BY_CHAIN: Record<ChainId, VenueId> = {
  bnb: 'bstock',
  solana: 'ondo',
}

export const DEFAULT_VENUE: VenueId = 'ondo'

export const isVenueAvailableOnChain = (venue: VenueId, chain: ChainId): boolean =>
  VENUE_LISTING_DESCRIPTORS[chain][venue] !== undefined

/**
 * The default listing for each issuer, retained for older callers that only
 * carry a venue. New requests should pass their selected chain explicitly.
 */
export const VENUES: Record<VenueId, VenueDescriptor> = {
  bstock: {
    id: 'bstock',
    label: 'bStocks',
    chain: 'bnb',
    pathPrefix: '',
    payToken: 'USDT',
    wallet: 'evm',
  },
  ondo: {
    id: 'ondo',
    label: 'Ondo',
    chain: 'solana',
    pathPrefix: '/solana/ondo',
    payToken: 'USDC',
    wallet: 'svm',
  },
  prestock: {
    id: 'prestock',
    label: 'PreStocks',
    chain: 'solana',
    pathPrefix: '/solana',
    payToken: 'USDC',
    wallet: 'svm',
  },
}

/** Resolve the chain-specific route for an issuer listing. */
export const listingDescriptor = (venue: VenueId, chain?: ChainId): VenueDescriptor => {
  const selectedChain = chain ?? VENUES[venue].chain
  const listing = VENUE_LISTING_DESCRIPTORS[selectedChain][venue]
  if (!listing) {
    throw new RangeError(`Venue ${venue} is not available on ${selectedChain}`)
  }
  return { id: venue, label: VENUES[venue].label, ...listing }
}

/** Backwards-compatible name; an explicit chain now selects its own listing. */
export const venueDescriptor = listingDescriptor

export const isVenueId = (value: unknown): value is VenueId =>
  typeof value === 'string' && (VENUE_IDS as readonly string[]).includes(value)

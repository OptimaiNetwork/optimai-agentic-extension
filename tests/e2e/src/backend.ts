import type { Locator } from '@playwright/test'

/**
 * The real backend the built extension calls.
 *
 * Read from the same variable the extension build reads
 * (`packages/shared/lib/constants/env.ts`), so the suite checks the server the
 * bundle under test actually talks to.
 */
export const BACKEND_URL = (
  process.env.CEB_CATALYST_API_URL || 'https://agentic-api.optimai.network'
).replace(/\/$/, '')

const REQUEST_TIMEOUT_MS = 30_000

/** GET a route on the real backend. Returns null on a 404, throws on any other failure. */
export async function backendJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`${BACKEND_URL}${path} answered ${response.status}: ${await response.text()}`)
  }
  return (await response.json()) as T
}

/** The parts of `/stocks/{ticker}` the specs compare the panel against. */
export interface LiveQuote {
  symbol: string
  ticker: string
  multiplier: string
  reference_price: string
  tradability: string
  divergence: { token_price: string; stock_price: string; percent: string } | null
  fundamentals: { week52_high: string | null; week52_low: string | null } | null
}

/**
 * Where a listing's routes are mounted, keyed by the labels the panel's header
 * shows (`Chain: Solana`, `Issuer: Ondo`). Mirrors `VENUE_LISTING_DESCRIPTORS`
 * in `packages/shared/lib/constants/env.ts`.
 */
const PREFIXES: Record<string, Record<string, string>> = {
  'BNB Chain': { bStocks: '', Ondo: '/ondo' },
  Solana: { Ondo: '/solana/ondo', PreStocks: '/solana' },
}

export interface Listing {
  chain: string
  issuer: string
  prefix: string
}

export function listingFor(chain: string, issuer: string): Listing {
  const prefix = PREFIXES[chain]?.[issuer]
  if (prefix === undefined) throw new Error(`No route prefix known for ${issuer} on ${chain}`)
  return { chain, issuer, prefix }
}

/**
 * The listing the panel is reading, from its own header.
 *
 * The profile is persistent, so a chain or issuer picked by hand in an earlier
 * session survives into the run. Reading it back keeps the comparison honest
 * whichever listing is selected.
 */
export async function selectedListing(panel: Locator): Promise<Listing> {
  const chain = await panel.getByRole('button', { name: /^Chain: / }).getAttribute('aria-label')
  const issuer = await panel.getByRole('button', { name: /^Issuer: / }).getAttribute('aria-label')
  return listingFor(chain!.replace('Chain: ', ''), issuer!.replace('Issuer: ', ''))
}

export const liveQuote = (listing: Listing, ticker: string) =>
  backendJson<LiveQuote>(`${listing.prefix}/stocks/${ticker}`)

/** Whether the listing can price this cashtag at all, by the server's own resolver. */
export const resolvesOn = async (listing: Listing, cashtag: string): Promise<boolean> =>
  (await backendJson(`${listing.prefix}/stocks/resolve?cashtag=${cashtag}`)) !== null

/** `$1,234.56` (as the panel renders money) to 1234.56. */
export function parseUsd(text: string): number {
  const match = /\$([\d,]+(?:\.\d+)?)/.exec(text)
  if (!match) throw new Error(`No dollar amount in ${JSON.stringify(text)}`)
  return Number(match[1]!.replace(/,/g, ''))
}

/** Relative distance between two prices, as a fraction of the second. */
export const relativeGap = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b)

/** Rendered prices carry cents, so two of them can disagree by a cent each. */
export const CENT = 0.01

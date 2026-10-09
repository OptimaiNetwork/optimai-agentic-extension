import type { ChainId, VenueId } from '@extension/shared'
import type { VenueSelection } from '@x/modules/venue'
import type { BadgeKind } from '../scan/badge'
import type { Lexicon, LexiconListing, Listing } from '../services/types'

/** The listings a card can be read from. xStocks has no quote here. */
const quotableListings = (ticker: string, lexicon: Pick<Lexicon, 'tokens'>): LexiconListing[] =>
  (lexicon.tokens[ticker] ?? []).filter((listing) => listing.quotable && listing.venue !== 'xstock')

/**
 * Which listing a ticker's card is read from.
 *
 * The one the user picked in the panel, when it carries the ticker; otherwise
 * the first the server ranked, which puts bStocks on BNB Chain first. An
 * xStocks listing is never chosen: it has no quote here.
 */
export const pickListing = (
  ticker: string,
  lexicon: Pick<Lexicon, 'tokens'>,
  selection: VenueSelection
): Listing | null => {
  const quotable = quotableListings(ticker, lexicon)
  const chosen =
    quotable.find(
      (listing) => listing.chain === selection.chain && listing.venue === selection.venue
    ) ?? quotable[0]
  return chosen ? { chain: chosen.chain, venue: chosen.venue as Listing['venue'] } : null
}

/**
 * The chains one issuer lists a ticker on, in the server's order: what the
 * trade panel can switch between. Only Ondo spans two chains today.
 */
export const listingChains = (
  ticker: string,
  lexicon: Pick<Lexicon, 'tokens'>,
  venue: VenueId
): ChainId[] =>
  quotableListings(ticker, lexicon)
    .filter((listing) => listing.venue === venue)
    .map((listing) => listing.chain)

/** A listing with the symbol its token trades under, which a badge shows before its card loads. */
export interface MentionListing extends Listing {
  symbol: string
}

const sameSymbol = (a: string, b: string): boolean =>
  a.replace(/^\$/, '').toUpperCase() === b.replace(/^\$/, '').toUpperCase()

/** The lexicon's entry for the listing a card on this ticker opens on. */
const cardListing = (
  ticker: string,
  lexicon: Pick<Lexicon, 'tokens'>,
  selection: VenueSelection
): LexiconListing | undefined => {
  const picked = pickListing(ticker, lexicon, selection)
  return picked
    ? quotableListings(ticker, lexicon).find(
        (listing) => listing.chain === picked.chain && listing.venue === picked.venue
      )
    : undefined
}

/**
 * Which listing a badge stands for.
 *
 * A symbol names one token, so its badge shows that token — on the selected
 * chain when the issuer lists it on two (`NVDAon`), and nowhere else. A company
 * name or a ticker shows the listing its card would open on. A symbol with no
 * quote here (an xStocks one) falls back to the company's listing, which is
 * still the company the reader meant.
 */
export const listingForMention = (
  ticker: string,
  kind: BadgeKind,
  term: string,
  lexicon: Pick<Lexicon, 'tokens'>,
  selection: VenueSelection
): MentionListing | null => {
  const own =
    kind === 'symbol'
      ? quotableListings(ticker, lexicon).filter((listing) => sameSymbol(listing.symbol, term))
      : []
  const chosen =
    own.find((listing) => listing.chain === selection.chain) ??
    own[0] ??
    cardListing(ticker, lexicon, selection)
  return chosen
    ? { chain: chosen.chain, venue: chosen.venue as Listing['venue'], symbol: chosen.symbol }
    : null
}

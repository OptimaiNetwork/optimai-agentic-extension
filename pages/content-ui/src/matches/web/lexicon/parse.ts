import type { Lexicon, LexiconListing, LexiconTerm } from '../services/types'

const KINDS = new Set(['ticker', 'symbol', 'name', 'alias'])
const CASES = new Set(['exact', 'capitalized'])
const CHAINS = new Set(['bnb', 'solana'])
const VENUES = new Set(['bstock', 'ondo', 'prestock', 'xstock'])
/** Far above the ~2,500 terms measured; a payload past it is not ours. */
const MAX_TERMS = 50_000
const MAX_TERM_LENGTH = 80

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asTerm = (value: unknown): LexiconTerm | null => {
  if (!isRecord(value)) return null
  const { term, ticker, kind, case: caseRule, needs_context } = value
  if (typeof term !== 'string' || !term.trim() || term.length > MAX_TERM_LENGTH) return null
  if (typeof ticker !== 'string' || !ticker) return null
  if (typeof kind !== 'string' || !KINDS.has(kind)) return null
  if (typeof caseRule !== 'string' || !CASES.has(caseRule)) return null
  return {
    term,
    ticker,
    kind: kind as LexiconTerm['kind'],
    case: caseRule as LexiconTerm['case'],
    needs_context: needs_context === true,
  }
}

const asListing = (value: unknown): LexiconListing | null => {
  if (!isRecord(value)) return null
  const { chain, venue, symbol, address, quotable } = value
  if (typeof chain !== 'string' || !CHAINS.has(chain)) return null
  if (typeof venue !== 'string' || !VENUES.has(venue)) return null
  if (typeof symbol !== 'string' || typeof address !== 'string') return null
  return {
    chain: chain as LexiconListing['chain'],
    venue: venue as LexiconListing['venue'],
    symbol,
    address,
    quotable: quotable === true,
  }
}

/**
 * The lexicon, if this is one; null otherwise.
 *
 * It arrives from our server or from storage another version of this extension
 * wrote, and every term becomes a regular match against every page, so a
 * malformed row is dropped rather than trusted. A payload with no usable term
 * at all is not a lexicon.
 */
export const parseLexicon = (value: unknown): Lexicon | null => {
  if (!isRecord(value)) return null
  const { version, generated_at, terms, tokens, names } = value
  if (typeof version !== 'string' || !version) return null
  if (!Array.isArray(terms) || terms.length > MAX_TERMS) return null
  if (!isRecord(tokens)) return null

  const parsedTerms = terms.map(asTerm).filter((term): term is LexiconTerm => term !== null)
  if (!parsedTerms.length) return null

  const parsedTokens: Record<string, LexiconListing[]> = {}
  for (const [ticker, listings] of Object.entries(tokens)) {
    if (!Array.isArray(listings)) continue
    const parsed = listings.map(asListing).filter((l): l is LexiconListing => l !== null)
    if (parsed.length) parsedTokens[ticker] = parsed
  }

  const parsedNames: Record<string, string> = {}
  if (isRecord(names)) {
    for (const [ticker, name] of Object.entries(names)) {
      if (typeof name === 'string') parsedNames[ticker] = name
    }
  }

  return {
    version,
    generated_at: typeof generated_at === 'string' ? generated_at : '',
    // A term for a ticker nothing lists would underline a word and then have
    // no card to open.
    terms: parsedTerms.filter((term) => parsedTokens[term.ticker]?.some((l) => l.quotable)),
    tokens: parsedTokens,
    names: parsedNames,
  }
}

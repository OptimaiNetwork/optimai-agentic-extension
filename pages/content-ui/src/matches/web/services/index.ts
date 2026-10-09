import catalystClient from '@x/libs/catalyst'

import type { HoverCard, Lexicon, LexiconVersion, Listing } from './types'

/** The whole lexicon is a few hundred kilobytes and is built server-side; allow for a cold build. */
const LEXICON_TIMEOUT_MS = 30_000
/** A cold card reads a quote, a day of candles and a logo in parallel upstream. */
const HOVER_TIMEOUT_MS = 25_000

export const pageService = {
  lexicon() {
    return catalystClient.get<Lexicon>('/lexicon', { timeoutMs: LEXICON_TIMEOUT_MS })
  },

  lexiconVersion() {
    return catalystClient.get<LexiconVersion>('/lexicon/version')
  },

  hover(ticker: string, listing: Listing) {
    return catalystClient.get<HoverCard>(`/hover/${encodeURIComponent(ticker)}`, {
      params: { chain: listing.chain, venue: listing.venue },
      timeoutMs: HOVER_TIMEOUT_MS,
    })
  },
}

export type * from './types'

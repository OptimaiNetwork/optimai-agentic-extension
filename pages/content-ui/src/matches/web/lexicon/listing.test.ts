import { describe, expect, test } from 'vitest'

import { listingChains, listingForMention, pickListing } from './listing'
import type { LexiconListing } from '../services/types'

const listing = (
  chain: LexiconListing['chain'],
  venue: LexiconListing['venue'],
  quotable = true,
  symbol = 'S'
): LexiconListing => ({ chain, venue, symbol, address: 'A', quotable })

const lexicon = {
  tokens: {
    NVDA: [listing('bnb', 'bstock'), listing('solana', 'ondo'), listing('bnb', 'xstock', false)],
    META: [listing('solana', 'ondo'), listing('bnb', 'ondo'), listing('bnb', 'bstock')],
    AAPL: [listing('solana', 'ondo'), listing('bnb', 'ondo', false)],
    CRWV: [listing('solana', 'ondo')],
    ONLYX: [listing('bnb', 'xstock', false)],
  },
}

describe('which listing a card is read from', () => {
  test('the one the panel has selected, when it carries the ticker', () => {
    expect(pickListing('NVDA', lexicon, { chain: 'solana', venue: 'ondo' })).toEqual({
      chain: 'solana',
      venue: 'ondo',
    })
  })

  test('otherwise the first the server ranked', () => {
    expect(pickListing('NVDA', lexicon, { chain: 'solana', venue: 'prestock' })).toEqual({
      chain: 'bnb',
      venue: 'bstock',
    })
    expect(pickListing('CRWV', lexicon, { chain: 'bnb', venue: 'bstock' })).toEqual({
      chain: 'solana',
      venue: 'ondo',
    })
  })

  test('never xStocks, which has no quote here', () => {
    expect(pickListing('ONLYX', lexicon, { chain: 'bnb', venue: 'bstock' })).toBeNull()
  })

  test('nothing for a ticker the lexicon does not know', () => {
    expect(pickListing('ZZZZ', lexicon, { chain: 'bnb', venue: 'bstock' })).toBeNull()
  })
})

describe('the chains the trade panel can switch between', () => {
  test("every chain the issuer lists the ticker on, in the server's order", () => {
    expect(listingChains('META', lexicon, 'ondo')).toEqual(['solana', 'bnb'])
  })

  test('one chain, so nothing to switch, for an issuer on a single chain', () => {
    expect(listingChains('META', lexicon, 'bstock')).toEqual(['bnb'])
  })

  test('not a listing that cannot be quoted', () => {
    expect(listingChains('AAPL', lexicon, 'ondo')).toEqual(['solana'])
  })

  test('nothing for a ticker the lexicon does not have', () => {
    expect(listingChains('NOPE', lexicon, 'ondo')).toEqual([])
  })
})

describe('which listing a badge shows', () => {
  const tokens = {
    tokens: {
      NVDA: [
        listing('bnb', 'bstock', true, 'NVDAB'),
        listing('solana', 'ondo', true, 'NVDAon'),
        listing('bnb', 'ondo', true, 'NVDAon'),
        listing('bnb', 'xstock', false, 'NVDAx'),
      ],
    },
  }
  const solana = { chain: 'solana', venue: 'ondo' } as const
  const bnbStocks = { chain: 'bnb', venue: 'bstock' } as const

  test('a symbol shows its own token, on the selected chain when it is on two', () => {
    expect(listingForMention('NVDA', 'symbol', 'NVDAon', tokens, bnbStocks)).toEqual({
      chain: 'bnb',
      venue: 'ondo',
      symbol: 'NVDAon',
    })
    expect(listingForMention('NVDA', 'symbol', 'NVDAB', tokens, solana)).toEqual({
      chain: 'bnb',
      venue: 'bstock',
      symbol: 'NVDAB',
    })
  })

  test('a company or ticker shows the listing a card would, with its symbol', () => {
    expect(listingForMention('NVDA', 'company', 'Nvidia', tokens, solana)).toEqual({
      chain: 'solana',
      venue: 'ondo',
      symbol: 'NVDAon',
    })
    expect(listingForMention('NVDA', 'ticker', 'NVDA', tokens, bnbStocks)).toEqual({
      chain: 'bnb',
      venue: 'bstock',
      symbol: 'NVDAB',
    })
  })

  test("a symbol with no quote here falls back to the company's listing", () => {
    expect(listingForMention('NVDA', 'symbol', 'NVDAx', tokens, bnbStocks)).toEqual({
      chain: 'bnb',
      venue: 'bstock',
      symbol: 'NVDAB',
    })
  })

  test('nothing for a ticker with no quotable listing', () => {
    expect(listingForMention('NOPE', 'company', 'Nope', tokens, solana)).toBeNull()
  })
})

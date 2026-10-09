import { describe, expect, test } from 'vitest'

import { parseLexicon } from './parse'

const valid = {
  version: 'v1',
  generated_at: '2026-09-23T00:00:00Z',
  terms: [
    { term: 'TSLA', ticker: 'TSLA', kind: 'ticker', case: 'exact', needs_context: false },
    { term: 'Tesla', ticker: 'TSLA', kind: 'alias', case: 'capitalized', needs_context: false },
    { term: 'AAPLx', ticker: 'AAPL', kind: 'symbol', case: 'exact', needs_context: false },
  ],
  tokens: {
    TSLA: [{ chain: 'bnb', venue: 'bstock', symbol: 'TSLAB', address: '0x1', quotable: true }],
    AAPL: [{ chain: 'bnb', venue: 'xstock', symbol: 'AAPLx', address: '0x2', quotable: false }],
  },
  names: { TSLA: 'Tesla', AAPL: 42 },
}

describe('reading a lexicon from the server or from storage', () => {
  test('keeps what is well formed', () => {
    const lexicon = parseLexicon(valid)!

    expect(lexicon.version).toBe('v1')
    expect(lexicon.terms.map((term) => term.term)).toEqual(['TSLA', 'Tesla'])
    expect(lexicon.names).toEqual({ TSLA: 'Tesla' })
  })

  test('drops a term whose ticker nothing can quote', () => {
    // AAPL is only an xStocks spelling here: underlining it would open no card.
    expect(parseLexicon(valid)!.terms.some((term) => term.ticker === 'AAPL')).toBe(false)
  })

  test('drops malformed rows rather than trusting them', () => {
    const lexicon = parseLexicon({
      ...valid,
      terms: [
        ...valid.terms,
        { term: '', ticker: 'TSLA', kind: 'ticker', case: 'exact' },
        { term: 'X'.repeat(200), ticker: 'TSLA', kind: 'name', case: 'capitalized' },
        { term: 'Tsla', ticker: 'TSLA', kind: 'nickname', case: 'exact' },
        { term: 'Tsla', ticker: 'TSLA', kind: 'name', case: 'loose' },
        'TSLA',
      ],
      tokens: {
        ...valid.tokens,
        BAD: [{ chain: 'eth', venue: 'bstock', symbol: 'B', address: '0x' }],
      },
    })!

    expect(lexicon.terms).toHaveLength(2)
    expect(lexicon.tokens.BAD).toBeUndefined()
  })

  test.each([
    ['not an object', 'lexicon'],
    ['no version', { ...valid, version: '' }],
    ['terms not a list', { ...valid, terms: {} }],
    ['no usable term', { ...valid, terms: [{ term: 1 }] }],
    [
      'far too many terms',
      { ...valid, terms: Array.from({ length: 50_001 }, () => valid.terms[0]) },
    ],
  ])('is not a lexicon: %s', (_why, value) => {
    expect(parseLexicon(value)).toBeNull()
  })
})

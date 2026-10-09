import { describe, expect, test } from 'vitest'

import { compileMatcher, findMatches } from './matcher'
import type { LexiconTerm } from '../services/types'

const term = (
  text: string,
  ticker: string,
  kind: LexiconTerm['kind'],
  needsContext = false
): LexiconTerm => ({
  term: text,
  ticker,
  kind,
  case: kind === 'ticker' || kind === 'symbol' ? 'exact' : 'capitalized',
  needs_context: needsContext,
})

const matcher = compileMatcher([
  term('TSLA', 'TSLA', 'ticker'),
  term('TSLAon', 'TSLA', 'symbol'),
  term('TSLAON', 'TSLA', 'symbol'),
  term('Tesla', 'TSLA', 'alias'),
  term('NVIDIA', 'NVDA', 'name'),
  term('ON', 'ON', 'ticker', true),
  term('NOW', 'NOW', 'ticker', true),
  term('Con', 'C', 'symbol', true),
  term('Bank of America', 'BAC', 'alias'),
  term('Bank', 'BANKX', 'name'),
  term('AT&T', 'T', 'alias'),
  term('BRK.B', 'BRKB', 'ticker'),
  term('Coca-Cola', 'KO', 'alias'),
  term('iShares MSCI Japan ETF', 'EWJ', 'name'),
  term('onsemi', 'ON', 'name'),
])

const found = (text: string) =>
  findMatches(text, matcher).map((match) => [text.slice(match.start, match.end), match.ticker])

describe('tickers', () => {
  test('match in capitals, with or without a cashtag', () => {
    expect(found('TSLA fell while $TSLA traders watched')).toEqual([
      ['TSLA', 'TSLA'],
      ['$TSLA', 'TSLA'],
    ])
  })

  test('never in lower case', () => {
    expect(found('tsla and Tsla')).toEqual([])
  })

  test('not inside a longer word', () => {
    expect(found('TSLAX TSLA2 XTSLA')).toEqual([])
  })

  test('a `$` glued to a word is not a cashtag', () => {
    expect(found('US$ON and ab$NOW')).toEqual([])
  })
})

describe('tickers that are also words need context', () => {
  test('bare, they are words', () => {
    expect(found('TURN ON THE LIGHTS NOW')).toEqual([])
  })

  test('after a cashtag', () => {
    expect(found('Bought $ON and $NOW today')).toEqual([
      ['$ON', 'ON'],
      ['$NOW', 'NOW'],
    ])
  })

  test('inside parentheses', () => {
    expect(found('ServiceNow (NOW) rose')).toEqual([['NOW', 'NOW']])
  })

  test('after an exchange prefix', () => {
    expect(found('ServiceNow (NYSE: NOW) and NASDAQ:ON')).toEqual([
      ['NOW', 'NOW'],
      ['ON', 'ON'],
    ])
  })

  test('an Ondo symbol that is a word', () => {
    expect(found('Con artists; buy $Con')).toEqual([['$Con', 'C']])
  })
})

describe('token symbols', () => {
  test('match as the issuer writes them and in capitals', () => {
    expect(found('TSLAon, $TSLAON')).toEqual([
      ['TSLAon', 'TSLA'],
      ['$TSLAON', 'TSLA'],
    ])
  })

  test('not in another case', () => {
    expect(found('tslaon TslaOn')).toEqual([])
  })
})

describe('company names', () => {
  test('match whenever the company capitalises them', () => {
    expect(found('Tesla, TESLA and NVIDIA, Nvidia')).toEqual([
      ['Tesla', 'TSLA'],
      ['TESLA', 'TSLA'],
      ['NVIDIA', 'NVDA'],
      ['Nvidia', 'NVDA'],
    ])
  })

  test('not in lower case', () => {
    expect(found('a tesla coil and nvidia drivers')).toEqual([])
  })

  test('a lower-case brand still matches as written', () => {
    expect(found('onsemi guided lower')).toEqual([['onsemi', 'ON']])
  })

  test('the longest name wins', () => {
    expect(found('Bank of America and the Bank')).toEqual([
      ['Bank of America', 'BAC'],
      ['Bank', 'BANKX'],
    ])
  })

  test('each word the company capitalises', () => {
    expect(found('bank of America')).toEqual([])
    expect(found('Bank Of America')).toEqual([['Bank Of America', 'BAC']])
  })

  test('across a line break inside a text node', () => {
    expect(found('iShares MSCI\nJapan ETF')).toEqual([['iShares MSCI\nJapan ETF', 'EWJ']])
  })

  test('possessives and compounds keep the name', () => {
    expect(found("Tesla's margin, Nvidia-backed startups, Tesla’s cars")).toEqual([
      ['Tesla', 'TSLA'],
      ['Nvidia', 'NVDA'],
      ['Tesla', 'TSLA'],
    ])
  })

  test('punctuation inside a name', () => {
    expect(found('AT&T, BRK.B and Coca-Cola.')).toEqual([
      ['AT&T', 'T'],
      ['BRK.B', 'BRKB'],
      ['Coca-Cola', 'KO'],
    ])
  })
})

test('a limit stops a page-sized run early', () => {
  expect(findMatches('TSLA TSLA TSLA TSLA', matcher, 2)).toHaveLength(2)
})

test('an empty lexicon finds nothing', () => {
  expect(findMatches('TSLA', compileMatcher([]))).toEqual([])
})

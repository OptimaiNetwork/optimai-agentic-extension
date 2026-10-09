import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { BADGE_TAG, badgeKey, insertBadges } from './badge'
import { collectTextNodes, HOST_ID } from './dom'
import { compileMatcher } from './matcher'
import { createScanner, type ScanLimits } from './scanner'
import type { LexiconTerm } from '../services/types'

const terms: LexiconTerm[] = [
  { term: 'TSLA', ticker: 'TSLA', kind: 'ticker', case: 'exact', needs_context: false },
  { term: 'Tesla', ticker: 'TSLA', kind: 'alias', case: 'capitalized', needs_context: false },
  { term: 'NVIDIA', ticker: 'NVDA', kind: 'name', case: 'capitalized', needs_context: false },
  { term: 'NVDAon', ticker: 'NVDA', kind: 'symbol', case: 'exact', needs_context: false },
  { term: 'NVDAB', ticker: 'NVDA', kind: 'symbol', case: 'exact', needs_context: false },
  { term: 'NOW', ticker: 'NOW', kind: 'ticker', case: 'exact', needs_context: true },
]
const matcher = compileMatcher(terms)
const now = (work: () => void) => work()
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

const scan = (limits?: Partial<ScanLimits>) => {
  const added: HTMLElement[] = []
  const scanner = createScanner({
    root: document.body,
    matcher,
    schedule: now,
    limits: { debounceMs: 0, ...limits },
    onBadges: (badges) => added.push(...badges),
  })
  scanner.start()
  return { scanner, added }
}

/** Each badge as [kind, ticker, the text just before it]. */
const badgesOnPage = () =>
  Array.from(document.querySelectorAll<HTMLElement>(BADGE_TAG)).map((badge) => {
    const before = badge.previousSibling?.textContent ?? ''
    return [badge.dataset.kind, badge.dataset.ticker, before.trim().split(/\s+/).pop()]
  })

let active: ReturnType<typeof scan> | null = null

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  active?.scanner.stop()
  active = null
})

describe('one badge per kind of mention', () => {
  test('after the first company name, ticker and symbol, and never again', () => {
    document.body.innerHTML = `<p>NVIDIA rose, NVIDIA guided higher and NVIDIA's NVDAon token
      followed. NVDAon traded, TSLA fell, Tesla held and TSLA recovered.</p>`

    active = scan()

    expect(badgesOnPage()).toEqual([
      ['company', 'NVDA', 'NVIDIA'],
      ['symbol', 'NVDA', 'NVDAon'],
      ['ticker', 'TSLA', 'TSLA'],
      ['company', 'TSLA', 'Tesla'],
    ])
  })

  test('two symbols of one company are two tokens, so two badges', () => {
    document.body.innerHTML = '<p>NVDAon on Solana, NVDAB on BNB Chain, NVDAon again.</p>'

    active = scan()

    expect(badgesOnPage()).toEqual([
      ['symbol', 'NVDA', 'NVDAon'],
      ['symbol', 'NVDA', 'NVDAB'],
    ])
  })

  test('the first mention wins across paragraphs', () => {
    document.body.innerHTML = '<p id="a">Tesla</p><p id="b">Tesla and TSLA</p>'

    active = scan()

    expect(document.querySelectorAll(`#a ${BADGE_TAG}`)).toHaveLength(1)
    expect(badgesOnPage()).toEqual([
      ['company', 'TSLA', 'Tesla'],
      ['ticker', 'TSLA', 'TSLA'],
    ])
  })

  test('the key names the kind and the token, not the spelling', () => {
    const [ticker, alias, name, symbol] = terms
    const match = (term: LexiconTerm) => ({ start: 0, end: 1, ticker: term.ticker, term })

    expect(badgeKey(match(ticker))).toBe('ticker:TSLA')
    expect(badgeKey(match(alias))).toBe('company:TSLA')
    expect(badgeKey(match(name))).toBe('company:NVDA')
    expect(badgeKey(match(symbol))).toBe('symbol:NVDAON')
  })
})

describe('where a badge goes, and what it leaves alone', () => {
  test('the page reads exactly as it did: a badge adds no text', () => {
    document.body.innerHTML = '<p>Tesla (TSLA) and NVIDIA rallied, NOW did not.</p>'
    const before = document.body.textContent

    active = scan()

    expect(document.querySelectorAll(BADGE_TAG)).toHaveLength(3)
    expect(document.body.textContent).toBe(before)
  })

  test('the page keeps its own text node, cut after the word', () => {
    document.body.innerHTML = '<p>Shares of Tesla rose</p>'
    const original = document.querySelector('p')!.firstChild as Text

    active = scan()

    expect(original.isConnected).toBe(true)
    expect(original.data).toBe('Shares of Tesla')
    expect(original.nextSibling?.nodeName.toLowerCase()).toBe(BADGE_TAG)
    expect(original.nextSibling?.nextSibling?.textContent).toBe(' rose')
  })

  test('after a link around the word, not inside it', () => {
    document.body.innerHTML = '<p><a href="/wiki/Nvidia">NVIDIA</a> rose</p>'

    active = scan()

    const link = document.querySelector('a')!
    expect(link.querySelector(BADGE_TAG)).toBeNull()
    expect(link.nextSibling?.nodeName.toLowerCase()).toBe(BADGE_TAG)
  })

  test('inside a link that is a whole card, right after the word', () => {
    const headline =
      'NVIDIA beats estimates as data-centre sales double for a third straight quarter'
    document.body.innerHTML = `<a href="/story"><h2>${headline}</h2></a>`

    active = scan()

    const badge = document.querySelector(BADGE_TAG)!
    expect(badge.closest('h2')).not.toBeNull()
    expect(badge.previousSibling?.textContent).toBe('NVIDIA')
  })

  test('several badges in one text node keep the order of the words', () => {
    document.body.innerHTML = '<p>TSLA and NVIDIA and NVDAon</p>'
    const node = document.querySelector('p')!.firstChild as Text
    const found = [
      { start: 0, end: 4, ticker: 'TSLA', term: terms[0] },
      { start: 9, end: 15, ticker: 'NVDA', term: terms[2] },
      { start: 20, end: 26, ticker: 'NVDA', term: terms[3] },
    ]

    const { badges } = insertBadges(node, found)

    expect(badges.map((badge) => badge.dataset.key)).toEqual([
      'ticker:TSLA',
      'company:NVDA',
      'symbol:NVDAON',
    ])
    expect(document.querySelector('p')!.textContent).toBe('TSLA and NVIDIA and NVDAon')
  })
})

describe('what is never scanned', () => {
  test('code, form fields, editors, hidden text and our own host', () => {
    document.body.innerHTML = `
      <pre>TSLA</pre><code>Tesla</code><textarea>TSLA</textarea>
      <div contenteditable="true">Tesla</div><div hidden>TSLA</div>
      <div aria-hidden="true">Tesla</div><div id="${HOST_ID}">NVIDIA</div>
      <script>var TSLA = 1</script><button>Tesla</button>
      <p>NVIDIA</p>`

    active = scan()

    expect(badgesOnPage()).toEqual([['company', 'NVDA', 'NVIDIA']])
  })

  test('a text node too short or without letters is not collected', () => {
    document.body.innerHTML = '<p>a</p><p> , </p><p>ok</p>'

    expect(collectTextNodes(document.body).map((node) => node.data)).toEqual(['ok'])
  })
})

describe('keeping up with the page', () => {
  test('content added later is scanned once, and a kind already badged stays silent', async () => {
    document.body.innerHTML = '<p>Tesla</p>'
    active = scan()

    const added = document.createElement('p')
    added.textContent = 'Tesla and NVIDIA beat estimates'
    document.body.append(added)
    await settle()
    await settle()

    expect(badgesOnPage()).toEqual([
      ['company', 'TSLA', 'Tesla'],
      ['company', 'NVDA', 'NVIDIA'],
    ])
    expect(active.added).toHaveLength(2)
  })

  test('a mention the page removes frees its kind for the next one', async () => {
    document.body.innerHTML = '<p id="old">Tesla</p>'
    active = scan()

    document.getElementById('old')!.remove()
    const added = document.createElement('p')
    added.textContent = 'Tesla again'
    document.body.append(added)
    await settle()
    await settle()

    expect(badgesOnPage()).toEqual([['company', 'TSLA', 'Tesla']])
  })

  test('our own badges do not come back as new content', async () => {
    document.body.innerHTML = '<p>Tesla, TSLA and NVIDIA, NVIDIA and Tesla</p>'
    active = scan()
    const first = active.scanner.stats()

    await settle()
    await settle()

    expect(active.scanner.stats().textNodes).toBe(first.textNodes)
    expect(document.querySelectorAll(BADGE_TAG)).toHaveLength(3)
  })

  test('a limit on badges is honoured across nodes', () => {
    document.body.innerHTML = '<p>Tesla TSLA</p><p>NVIDIA NVDAon</p><p>NVDAB</p>'

    active = scan({ maxBadges: 3 })

    expect(document.querySelectorAll(BADGE_TAG)).toHaveLength(3)
    expect(active.scanner.stats().badges).toBe(3)
  })

  test('stats report what was done', () => {
    document.body.innerHTML = '<p>Tesla</p><p>nothing here</p><p>NVIDIA</p>'

    active = scan()

    expect(active.scanner.stats()).toMatchObject({
      textNodes: 3,
      badges: 2,
      tickers: 2,
      done: true,
    })
  })
})

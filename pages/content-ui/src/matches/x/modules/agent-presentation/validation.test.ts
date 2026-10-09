/**
 * A bad part costs a part. It never costs the message.
 *
 * Both halves matter and the second is the one that bites: these snapshots are
 * also read back out of a checkpoint written by an older build, so "the server
 * would never send that" is not a defence.
 */

import {
  isSafeHttpUrl,
  parseActivitySnapshot,
  parseParts,
  parseResearchCard,
  parseVisualizationSpec,
} from '@extension/shared'
import type { ResearchUIMessage } from '@extension/shared'
import { describe, expect, it } from 'vitest'
import serverCards from './__fixtures__/server-cards.json'

const NOW = '2026-09-22T10:00:00Z'

const post = (id: string, url = `https://x.com/a/status/${id}`) => ({
  id,
  sourceId: `x_${id}`,
  url,
  text: `post ${id}`,
  author: { handle: 'someone', name: 'Some One', verified: false },
  observedAt: NOW,
  truncated: false,
})

const searchCard = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  kind: 'search-results',
  title: 'TSLA on X',
  subject: { ticker: 'TSLA' },
  observedAt: NOW,
  status: 'complete',
  sourceToolCallIds: ['c1'],
  sourceIds: ['x_1'],
  limitations: [],
  evidenceId: 'ev_1',
  query: 'TSLA',
  mode: 'latest',
  window: {},
  sample: { collected: 5, deduplicated: 5, relevant: 5, classified: 0, authors: 3 },
  posts: [post('1')],
  ...overrides,
})

const sentimentCard = (counts: Record<string, number>, relevant: number) => ({
  ...searchCard(),
  kind: 'sentiment',
  counts: {
    bullish: 0,
    bearish: 0,
    neutral: 0,
    mixed: 0,
    uncertain: 0,
    unclassified: 0,
    ...counts,
  },
  sample: { collected: 5, deduplicated: 5, relevant, classified: relevant, authors: 3 },
  annotations: [],
})

describe('parseResearchCard', () => {
  it('accepts a well-formed search card', () => {
    const card = parseResearchCard(searchCard())
    expect(card?.kind).toBe('search-results')
  })

  it('rejects a card with no subject ticker', () => {
    expect(parseResearchCard(searchCard({ subject: {} }))).toBeNull()
  })

  it('rejects a kind this build does not know', () => {
    // A future card type must fall back to a notice, not throw in a renderer.
    expect(parseResearchCard(searchCard({ kind: 'catalyst-timeline' }))).toBeNull()
  })

  it('drops one unusable post rather than the whole card', () => {
    const card = parseResearchCard(
      searchCard({ posts: [post('1'), post('2', 'javascript:alert(1)'), post('3')] })
    )
    expect(card).not.toBeNull()
    expect(card && 'posts' in card && card.posts.map((p) => p.id)).toEqual(['1', '3'])
  })

  it('refuses sentiment counts that do not add up to the sample', () => {
    // The one invariant a JSON Schema cannot state. A card failing it had its
    // numbers computed somewhere that is not allowed to compute them.
    expect(parseResearchCard(sentimentCard({ bullish: 2, bearish: 1 }, 5))).toBeNull()
  })

  it('accepts sentiment counts that do', () => {
    const card = parseResearchCard(sentimentCard({ bullish: 3, bearish: 2 }, 5))
    expect(card?.kind).toBe('sentiment')
  })

  it('drops an annotation with an unknown stance', () => {
    const base = sentimentCard({ bullish: 1 }, 1)
    const card = parseResearchCard({
      ...base,
      annotations: [
        { postId: '1', stance: 'bullish', subject: 'TSLA', model: 'm', methodVersion: '1' },
        { postId: '2', stance: 'moon', subject: 'TSLA', model: 'm', methodVersion: '1' },
      ],
    })
    expect(card && 'annotations' in card && card.annotations).toHaveLength(1)
  })
})

describe('parseVisualizationSpec', () => {
  const flow = (overrides: Record<string, unknown> = {}) => ({
    type: 'flow',
    version: 1,
    title: 'Token to share',
    nodes: [
      { id: 'a', label: 'Token price' },
      { id: 'b', label: 'Share price' },
    ],
    edges: [{ from: 'a', to: 'b', label: 'divided by multiplier' }],
    ...overrides,
  })

  it('accepts a coherent graph', () => {
    expect(parseVisualizationSpec(flow())?.nodes).toHaveLength(2)
  })

  it('rejects an edge pointing at a node that does not exist', () => {
    expect(parseVisualizationSpec(flow({ edges: [{ from: 'a', to: 'ghost' }] }))).toBeNull()
  })

  it('rejects a self edge', () => {
    expect(parseVisualizationSpec(flow({ edges: [{ from: 'a', to: 'a' }] }))).toBeNull()
  })

  it('rejects duplicate node ids', () => {
    expect(
      parseVisualizationSpec(
        flow({
          nodes: [
            { id: 'a', label: 'One' },
            { id: 'a', label: 'Two' },
          ],
          edges: [],
        })
      )
    ).toBeNull()
  })

  it('rejects an empty graph and an oversized one', () => {
    expect(parseVisualizationSpec(flow({ nodes: [], edges: [] }))).toBeNull()
    const many = Array.from({ length: 17 }, (_, i) => ({ id: `n${i}`, label: `N${i}` }))
    expect(parseVisualizationSpec(flow({ nodes: many, edges: [] }))).toBeNull()
  })

  it('defaults direction rather than failing without it', () => {
    expect(parseVisualizationSpec(flow())?.direction).toBe('vertical')
  })
})

describe('isSafeHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isSafeHttpUrl('https://x.com/a/status/1')).toBe(true)
    expect(isSafeHttpUrl('http://example.com')).toBe(true)
  })

  it('refuses script-bearing schemes', () => {
    // These come from posts read off a page. A link is an execution surface.
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,<script>')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
  })
})

describe('parseActivitySnapshot', () => {
  it('keeps the steps it can read and drops the rest', () => {
    const snapshot = parseActivitySnapshot({
      version: 1,
      runId: 'run_1',
      status: 'completed',
      steps: [
        { id: 's1', code: 'search_x', status: 'completed', startedAt: NOW },
        { nonsense: true },
      ],
    })
    expect(snapshot?.steps).toHaveLength(1)
  })

  it('rejects a version it does not know', () => {
    expect(
      parseActivitySnapshot({ version: 2, runId: 'r', status: 'completed', steps: [] })
    ).toBeNull()
  })
})

describe('parseParts', () => {
  const message = (parts: unknown[]): ResearchUIMessage =>
    ({
      id: 'run_1_answer',
      role: 'assistant',
      parts,
      metadata: {
        schemaVersion: 1,
        runId: 'run_1',
        createdAt: NOW,
        status: 'complete',
        citations: [],
        limitations: [],
      },
    }) as unknown as ResearchUIMessage

  it('keeps good parts around a broken one', () => {
    const parsed = parseParts(
      message([
        {
          type: 'data-activity',
          id: 'a',
          data: { version: 1, runId: 'run_1', status: 'completed', steps: [] },
        },
        { type: 'data-research-card', id: 'bad', data: { kind: 'sentiment' } },
        { type: 'text', id: 't', text: 'The prose survives.' },
      ])
    )
    expect(parsed.map((p) => p.kind)).toEqual(['activity', 'unsupported', 'text'])
  })

  it('drops an empty text part rather than rendering a blank line', () => {
    expect(parseParts(message([{ type: 'text', id: 't', text: '   ' }]))).toHaveLength(0)
  })

  it('marks an unknown part type as unsupported rather than dumping it', () => {
    const [part] = parseParts(message([{ type: 'tool-search_x', id: 'x', data: { raw: 1 } }]))
    expect(part).toEqual({ kind: 'unsupported', id: 'x', type: 'tool-search_x' })
  })

  it('survives a message with no parts at all', () => {
    expect(parseParts(message([]))).toEqual([])
    expect(parseParts(null)).toEqual([])
  })
})

const base = {
  version: 1,
  title: 'NVDA',
  subject: { ticker: 'NVDA' },
  observedAt: NOW,
  status: 'complete',
  sourceToolCallIds: ['m1'],
  sourceIds: ['market_1'],
  limitations: [],
}

const price = (basis: string, value = '219.13') => ({ value, currency: 'USD', basis })

describe('market cards keep the basis of every number', () => {
  it('accepts a snapshot whose prices say what they are prices of', () => {
    const card = parseResearchCard({
      ...base,
      kind: 'market-snapshot',
      referencePrice: price('reference'),
      tokenPrice: price('token', '219.51'),
      sharePrice: price('share', '219.38'),
    })
    expect(card?.kind).toBe('market-snapshot')
  })

  it('drops a price whose basis is missing rather than guessing one', () => {
    // An unlabelled price rendered under a "Reference" caption is how the
    // panel reports a gap that is arithmetic. Better to show one fewer row.
    const card = parseResearchCard({
      ...base,
      kind: 'market-snapshot',
      referencePrice: price('reference'),
      tokenPrice: { value: '219.51', currency: 'USD' },
    })
    expect(card?.kind).toBe('market-snapshot')
    expect((card as unknown as { tokenPrice: unknown }).tokenPrice).toBeNull()
  })

  it('refuses a snapshot with no usable price at all', () => {
    expect(parseResearchCard({ ...base, kind: 'market-snapshot' })).toBeNull()
  })

  it('refuses a basis it does not know', () => {
    const card = parseResearchCard({
      ...base,
      kind: 'market-snapshot',
      referencePrice: price('midpoint'),
    })
    expect(card).toBeNull()
  })
})

describe('issuer comparison needs something to compare', () => {
  const row = (venue: string, referencePrice: string | null = '219.13') => ({
    venue,
    venueLabel: venue,
    chain: 'bsc',
    symbol: 'NVDAon',
    currency: 'USD',
    referencePrice,
  })

  it('accepts two or more issuers', () => {
    const card = parseResearchCard({
      ...base,
      kind: 'issuer-comparison',
      rows: [row('bstocks'), row('ondo')],
    })
    expect(card?.kind).toBe('issuer-comparison')
  })

  it('refuses a single row, which is a price and not a comparison', () => {
    expect(
      parseResearchCard({ ...base, kind: 'issuer-comparison', rows: [row('bstocks')] })
    ).toBeNull()
  })

  it('drops a malformed row and keeps the comparison when enough survive', () => {
    const card = parseResearchCard({
      ...base,
      kind: 'issuer-comparison',
      rows: [row('bstocks'), row('ondo'), { venue: 'prestocks' }],
    })
    expect((card as unknown as { rows: unknown[] }).rows).toHaveLength(2)
  })
})

describe('the generated schema layer catches what a field-name check cannot', () => {
  const card = (overrides: Record<string, unknown> = {}) => ({
    ...base,
    kind: 'search-results',
    evidenceId: 'ev_1',
    query: 'q',
    mode: 'latest',
    window: {},
    sample: { collected: 2, deduplicated: 2, relevant: 2, classified: 0, authors: 1 },
    posts: [],
    ...overrides,
  })

  it('accepts a card that matches the contract', () => {
    expect(parseResearchCard(card())?.kind).toBe('search-results')
  })

  it('refuses a string where the contract says integer', () => {
    // The field is present and named correctly. Only its type is wrong, which
    // is exactly the drift a name-only check waves through.
    expect(parseResearchCard(card({ sample: { ...card().sample, collected: '2' } }))).toBeNull()
  })

  it('refuses a count below zero', () => {
    expect(parseResearchCard(card({ sample: { ...card().sample, authors: -1 } }))).toBeNull()
  })

  it('refuses an enum value this build has never heard of', () => {
    expect(parseResearchCard(card({ mode: 'sideways' }))).toBeNull()
    expect(parseResearchCard(card({ status: 'probably' }))).toBeNull()
  })

  it('refuses a field the contract does not declare', () => {
    // `extra="forbid"` on the Python side, enforced here too: a field nobody
    // agreed on is a payload from something other than this contract.
    expect(parseResearchCard(card({ surpriseField: 'hello' }))).toBeNull()
  })

  it('refuses a timestamp that is not one', () => {
    expect(parseResearchCard(card({ observedAt: 'yesterday' }))).toBeNull()
  })

  it('still drops one bad item rather than the whole card', () => {
    const parsed = parseResearchCard(
      card({
        posts: [
          post('1'),
          { ...post('2'), url: 'javascript:alert(1)' },
          { ...post('3'), observedAt: 42 },
        ],
      })
    )
    // One safe post survives; the script URL and the malformed timestamp do not.
    expect((parsed as unknown as { posts: unknown[] }).posts).toHaveLength(1)
  })

  it('keeps a flow whose edges all point at declared nodes', () => {
    const spec = parseVisualizationSpec({
      type: 'flow',
      version: 1,
      title: 'Route',
      direction: 'vertical',
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      edges: [{ from: 'a', to: 'b' }],
    })
    expect(spec?.nodes).toHaveLength(2)
  })

  it('refuses a flow icon outside the contract', () => {
    expect(
      parseVisualizationSpec({
        type: 'flow',
        version: 1,
        title: 'Route',
        direction: 'vertical',
        nodes: [{ id: 'a', label: 'A', icon: 'rocket' }],
        edges: [],
      })
    ).toBeNull()
  })
})

describe('a claim-check headline must follow from its own counts', () => {
  const claim = (overrides: Record<string, unknown> = {}) => ({
    ...base,
    kind: 'claim-check',
    claim: 'NVIDIA guided Q4 revenue above $40B',
    verdict: 'unverified',
    sources: [],
    primaryChecked: 0,
    primarySupporting: 0,
    primaryContradicting: 0,
    ...overrides,
  })

  it('accepts a verdict its numbers support', () => {
    const card = parseResearchCard(
      claim({ verdict: 'corroborated', primaryChecked: 2, primarySupporting: 1 })
    )
    expect(card?.kind).toBe('claim-check')
  })

  it('refuses "corroborated" with nothing supporting it', () => {
    // The one field a reader acts on, and the one a model would most like to
    // write itself.
    expect(parseResearchCard(claim({ verdict: 'corroborated', primaryChecked: 3 }))).toBeNull()
  })

  it('refuses "contradicted" when no source contradicts', () => {
    expect(
      parseResearchCard(claim({ verdict: 'contradicted', primaryChecked: 2, primarySupporting: 2 }))
    ).toBeNull()
  })

  it('refuses more judgements than sources checked', () => {
    expect(
      parseResearchCard(
        claim({
          verdict: 'mixed',
          primaryChecked: 1,
          primarySupporting: 1,
          primaryContradicting: 1,
        })
      )
    ).toBeNull()
  })

  it('keeps "unverified" when nothing was found either way', () => {
    const card = parseResearchCard(claim({ primaryChecked: 4 }))
    expect(card?.kind).toBe('claim-check')
    // Silence, not denial.
    expect((card as unknown as { verdict: string }).verdict).toBe('unverified')
  })
})

describe('every card kind the server sends is one the panel accepts', () => {
  // Serialised by the server's own builders (`trade_intent_card`, `markets_card`,
  // `portfolio_card`) exactly as `ui_projection.py` puts them on the wire, nulls
  // included. These three kinds shipped with schema and renderer but no case in
  // `parseResearchCard`, so every one of them rendered as "A result could not
  // be shown" — the confirmation card for a trade the user had just asked for.
  it.each(Object.entries(serverCards))('accepts a %s card as the server builds it', (_, card) => {
    expect(parseResearchCard(card)).not.toBeNull()
  })
})

describe('a trade analysis headline must follow from its own split', () => {
  const analysis = (overrides: Record<string, unknown> = {}) => ({
    ...base,
    kind: 'trade-analysis',
    symbol: 'NVDAB',
    chain: 'bnb',
    split: { buy: 48, hold: 41, sell: 11 },
    lean: 'buy',
    confidence: 'moderate',
    held: false,
    signals: [{ key: 'trend', reading: 'Up 6.2% in 30 days', lean: 'bullish', score: '0.44' }],
    risks: [{ key: 'volatility', reading: 'Moves about 2.6% a day', level: 'medium' }],
    ...overrides,
  })

  it('accepts a lean that is the largest share', () => {
    expect(parseResearchCard(analysis())?.kind).toBe('trade-analysis')
  })

  it('refuses a lean its split does not make', () => {
    // The field a reader acts on. A card that says "buy" over a split that
    // says "hold" is dropped, not drawn.
    expect(parseResearchCard(analysis({ lean: 'hold' }))).toBeNull()
  })

  it('gives a tie to Hold', () => {
    const tie = { buy: 40, hold: 40, sell: 20 }
    expect(parseResearchCard(analysis({ split: tie, lean: 'hold' }))).not.toBeNull()
    expect(parseResearchCard(analysis({ split: tie, lean: 'buy' }))).toBeNull()
  })

  it('refuses a split that is not whole', () => {
    expect(parseResearchCard(analysis({ split: { buy: 48, hold: 41, sell: 12 } }))).toBeNull()
  })

  it('refuses a signal key outside the contract', () => {
    expect(
      parseResearchCard(
        analysis({ signals: [{ key: 'astrology', reading: 'Mercury is in retrograde' }] })
      )
    ).toBeNull()
  })
})

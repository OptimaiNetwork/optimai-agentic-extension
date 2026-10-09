/**
 * What the panel will accept from the server, and from its own checkpoint.
 *
 * Both are untrusted here, and the second one is the reason this file is not
 * optional: a snapshot written by yesterday's build is read by today's, and a
 * card whose shape has moved on must not reach a renderer that will throw
 * inside somebody's X tab.
 *
 * The rule throughout is **isolate, do not abort**. A malformed part is
 * dropped and the rest of the message renders; a malformed message is dropped
 * and the rest of the transcript renders. Nothing here throws.
 *
 * Validation happens in two layers, and the split is deliberate.
 *
 * **Structure** is checked by validators compiled from the Python models at
 * build time (`generated/validators.js`). MV3's CSP forbids `new Function`, so
 * Ajv cannot compile a schema in the browser — its *standalone* mode does the
 * compilation during the build and emits plain functions. That layer catches
 * what a hand-written check drifts away from: a string where an integer
 * belongs, a negative count, an enum value this build has never heard of, a
 * field the server stopped sending.
 *
 * **Meaning** is checked here, because JSON Schema cannot state it: that stance
 * buckets sum to the relevant sample, that a flow's edges point at nodes it
 * declares, that a URL is safe to put in an `href`, that a comparison has more
 * than one row. A payload can be perfectly well-formed and still say something
 * untrue, and those are the checks that catch it.
 */

import type {
  ActivitySnapshot,
  ActivityStep,
  ComparisonRow,
  PriceReading,
  ResearchCard,
  ResearchPostSnapshot,
  ResearchUIMessage,
  SampleCoverage,
  Stance,
  StanceCounts,
  VisualizationSpec,
} from './ui-message.js'
import { STANCES } from './ui-message.js'
import {
  validateActivitySnapshot as validateActivityStructure,
  validateActivityStep as validateStep,
  validateComparisonRow as validateRow,
  validatePriceReading as validatePrice,
  validateResearchCard as validateCardStructure,
  validateResearchPostSnapshot as validatePost,
  validateStanceAnnotation as validateAnnotation,
  validateVisualizationSpec as validateFlowStructure,
} from './generated/validators.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isNonNegativeInteger = (value: unknown): value is number =>
  isFiniteNumber(value) && Number.isInteger(value) && value >= 0

/**
 * A string that is safe to put in an `href`.
 *
 * `javascript:` and `data:` in a link are script execution, and these URLs
 * come from posts the collector read off a page. Anything that is not plainly
 * http(s) is refused rather than sanitised.
 */
export const isSafeHttpUrl = (value: unknown): value is string => {
  if (!isString(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const BASES = ['token', 'share', 'reference'] as const

/**
 * A price, with the thing it is a price *of* attached.
 *
 * `basis` is required rather than defaulted: a token price shown where a
 * reference price belongs is the one error that makes the panel report
 * arbitrage that does not exist, and a default would pick a side silently.
 */
const isPriceReading = (value: unknown): value is PriceReading =>
  isRecord(value) &&
  isString(value.value) &&
  isString(value.currency) &&
  (BASES as readonly string[]).includes(value.basis as string)

const isComparisonRow = (value: unknown): value is ComparisonRow =>
  isRecord(value) &&
  isString(value.venue) &&
  isString(value.venueLabel) &&
  isString(value.chain) &&
  isString(value.symbol) &&
  isString(value.currency)

const isSampleCoverage = (value: unknown): value is SampleCoverage =>
  isRecord(value) &&
  isNonNegativeInteger(value.collected) &&
  isNonNegativeInteger(value.deduplicated) &&
  isNonNegativeInteger(value.relevant) &&
  isNonNegativeInteger(value.classified) &&
  isNonNegativeInteger(value.authors)

const isStance = (value: unknown): value is Stance =>
  isString(value) && (STANCES as readonly string[]).includes(value)

const isStanceCounts = (value: unknown): value is StanceCounts =>
  isRecord(value) && STANCES.every((stance) => isNonNegativeInteger(value[stance]))

/**
 * A post whose URL can safely become an `href`.
 *
 * Shape is the schema's job. This is the part it cannot do: `javascript:` in a
 * link is script execution, the string is a perfectly valid string, and these
 * URLs came off a page somebody else wrote.
 */
const isSafePost = (value: unknown): value is ResearchPostSnapshot =>
  isRecord(value) && isSafeHttpUrl(value.url)

const hasCardBase = (value: Record<string, unknown>): boolean =>
  value.version === 1 &&
  isString(value.title) &&
  isRecord(value.subject) &&
  isString((value.subject as Record<string, unknown>).ticker) &&
  isString(value.observedAt) &&
  Array.isArray(value.sourceIds) &&
  Array.isArray(value.limitations)

/**
 * Parse one card, or return null.
 *
 * Per-kind rather than a single generic check: the renderers index into
 * kind-specific fields, so "it has a `kind`" is not enough to make rendering
 * safe. Posts inside a card are filtered individually — one post with an
 * unusable URL costs that row, not the card.
 */
/** Keep the items that validate; drop the ones that do not. Never throws. */
const keep = (value: unknown, check: (item: unknown) => boolean): unknown[] =>
  Array.isArray(value) ? value.filter(check) : []

/**
 * A copy of the card with every repeated element checked individually.
 *
 * Posts get one extra check the schema cannot make: `javascript:` in a URL is
 * script execution and a perfectly valid string, and these URLs came off a page
 * somebody else wrote.
 */
const withCleanLists = (value: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = { ...value }
  if ('posts' in value) {
    cleaned.posts = keep(value.posts, (post) => validatePost(post) && isSafePost(post))
  }
  if ('annotations' in value) cleaned.annotations = keep(value.annotations, validateAnnotation)
  if ('rows' in value) cleaned.rows = keep(value.rows, validateRow)
  for (const field of ['tokenPrice', 'referencePrice', 'sharePrice'] as const) {
    if (field in value && value[field] != null && !validatePrice(value[field])) {
      cleaned[field] = null
    }
  }
  return cleaned
}

export const parseResearchCard = (value: unknown): ResearchCard | null => {
  if (!isRecord(value)) return null

  // Lists are cleaned *before* the card is validated, not after. A card carries
  // repeated elements — posts, annotations, rows, candles — and one malformed
  // element must cost that element, not the card: a sentiment card that
  // vanishes because a future server added a seventh stance is a worse outcome
  // than the same card with one annotation missing. Each element is checked
  // against its own generated validator, so the drift protection is the same.
  const cleaned = withCleanLists(value)
  if (!validateCardStructure(cleaned)) return null
  const card = cleaned

  switch (card.kind) {
    case 'search-results':
      return card as unknown as ResearchCard
    case 'sentiment': {
      // The invariant a schema cannot state: every relevant post lands in
      // exactly one bucket. A card that fails it has had its numbers computed
      // somewhere other than the one place that is allowed to compute them.
      const counts = card.counts as StanceCounts
      const sample = card.sample as SampleCoverage
      const total = STANCES.reduce((sum, stance) => sum + counts[stance], 0)
      if (total !== sample.relevant) return null
      return card as unknown as ResearchCard
    }
    case 'market-snapshot':
      // A snapshot with no usable price at all is structurally fine and says
      // nothing. Individual prices were dropped above if their basis was
      // missing — an uncaptioned price is the unlabelled number this card
      // exists to prevent.
      if (!card.tokenPrice && !card.referencePrice && !card.sharePrice) return null
      return card as unknown as ResearchCard
    case 'price-chart':
      // One point drawn as a line is a trend with no evidence behind it.
      return (card.candles as unknown[]).length >= 2 ? (card as unknown as ResearchCard) : null
    case 'issuer-comparison':
      // One row is not a comparison. Rendering it as one would present a single
      // issuer's price as if it had been ranked against something.
      return (card.rows as unknown[]).length >= 2 ? (card as unknown as ResearchCard) : null
    case 'backing':
    case 'markets':
    case 'portfolio':
    case 'trade-intent':
      return card as unknown as ResearchCard
    case 'trade-analysis': {
      // The split is the field a reader acts on. It has to be whole, and the
      // lean has to be its largest share with Hold winning a tie, or a card
      // restored from an older checkpoint could headline a call its own
      // numbers do not make.
      const split = card.split as { buy: number; hold: number; sell: number }
      if (split.buy + split.hold + split.sell !== 100) return null
      const lean = (['hold', 'buy', 'sell'] as const).reduce((best, side) =>
        split[side] > split[best] ? side : best
      )
      if (card.lean !== lean) return null
      return card as unknown as ResearchCard
    }
    case 'claim-check': {
      // The headline has to be what the counts say. This is the one field a
      // reader acts on, and a card restored from an older checkpoint — or from
      // a server that computed it differently — must not get to assert a
      // verdict its own numbers do not support.
      const supporting = Number(card.primarySupporting ?? 0)
      const against = Number(card.primaryContradicting ?? 0)
      const checked = Number(card.primaryChecked ?? 0)
      if (supporting + against > checked) return null
      const expected =
        supporting && against
          ? 'mixed'
          : supporting
            ? 'corroborated'
            : against
              ? 'contradicted'
              : 'unverified'
      if (card.verdict !== expected) return null
      return card as unknown as ResearchCard
    }
    default:
      // A kind this build does not know. The caller shows "not supported here"
      // and keeps the prose, rather than pretending the answer is incomplete.
      return null
  }
}

/** A flow whose edges all point at nodes it declares. Anything else is null. */
export const parseVisualizationSpec = (value: unknown): VisualizationSpec | null => {
  if (!isRecord(value) || !validateFlowStructure(value)) return null

  // Referential integrity, which the schema cannot express: node IDs are unique
  // and every edge joins two nodes the spec itself declares. An edge pointing
  // at a node that is not there would lay out against nothing.
  const nodes = value.nodes as { id: string }[]
  const ids = new Set<string>()
  for (const node of nodes) {
    if (ids.has(node.id)) return null
    ids.add(node.id)
  }

  const edges = (value.edges ?? []) as { from: string; to: string }[]
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) return null
    if (edge.from === edge.to) return null
  }

  return {
    ...value,
    edges,
    direction: value.direction ?? 'vertical',
  } as unknown as VisualizationSpec
}

const isActivityStep = (value: unknown): value is ActivityStep =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.code) &&
  isString(value.status) &&
  isString(value.startedAt)

export const parseActivitySnapshot = (value: unknown): ActivitySnapshot | null => {
  if (!isRecord(value)) return null
  // Same rule as a card's lists: a step this build cannot read costs that step.
  // A timeline that disappears because one step carried an unfamiliar status
  // takes the whole record of what ran with it.
  const cleaned = { ...value, steps: keep(value.steps, validateStep) }
  if (!validateActivityStructure(cleaned)) return null
  return cleaned as unknown as ActivitySnapshot
}

/**
 * The parsed contents of one part, or `null` where it could not be used.
 *
 * Returned rather than rendered so the caller decides what a dropped part
 * looks like — a card boundary shows a small notice, the transcript store
 * simply omits it from a checkpoint.
 */
export type ParsedPart =
  | { kind: 'text'; id: string; text: string }
  | { kind: 'card'; id: string; card: ResearchCard }
  | { kind: 'visualization'; id: string; spec: VisualizationSpec }
  | { kind: 'activity'; id: string; activity: ActivitySnapshot }
  | { kind: 'unsupported'; id: string; type: string }

export const parsePart = (
  part: { type: string; id?: string | null; text?: unknown; data?: unknown },
  index: number
): ParsedPart | null => {
  const id = part.id ?? `part-${index}`
  switch (part.type) {
    case 'text':
      return isString(part.text) && part.text.trim() ? { kind: 'text', id, text: part.text } : null
    case 'data-research-card': {
      const card = parseResearchCard(part.data)
      return card ? { kind: 'card', id, card } : { kind: 'unsupported', id, type: part.type }
    }
    case 'data-visualization': {
      const spec = parseVisualizationSpec(part.data)
      return spec
        ? { kind: 'visualization', id, spec }
        : { kind: 'unsupported', id, type: part.type }
    }
    case 'data-activity': {
      const activity = parseActivitySnapshot(part.data)
      return activity ? { kind: 'activity', id, activity } : null
    }
    default:
      // Tool and source parts the SDK may add later. Known to exist, not known
      // how to draw — and silently dropping them is better than a raw dump.
      return { kind: 'unsupported', id, type: part.type }
  }
}

/** Every usable part of a message, in order. Never throws. */
export const parseParts = (message: ResearchUIMessage | null | undefined): ParsedPart[] => {
  if (!message || !Array.isArray(message.parts)) return []
  const parsed: ParsedPart[] = []
  message.parts.forEach((part, index) => {
    if (!isRecord(part) || !isString(part.type)) return
    const result = parsePart(part, index)
    if (result) parsed.push(result)
  })
  return parsed
}

export const isResearchUIMessage = (value: unknown): value is ResearchUIMessage =>
  isRecord(value) &&
  isString(value.id) &&
  value.role === 'assistant' &&
  Array.isArray(value.parts) &&
  isRecord(value.metadata) &&
  (value.metadata as Record<string, unknown>).schemaVersion === 1

import type { ActivityStep } from '@extension/shared'

import type { AgentActivityEvent, SummarizedActivity } from './view-contract'

export type { ActivitySummary, ActivityState } from './view-contract'

/**
 * What each telemetry code is called in the panel.
 *
 * The mapping lives on the client on purpose: the server emits allowlisted
 * machine names and never a display string, so a new tool cannot invent its own
 * wording, and a code this build has not heard of renders as a neutral line
 * rather than as somebody's internal identifier.
 *
 * The previous trail described every tool start as searching X — including the
 * ones that read a quote from an API and never touched the browser. These
 * labels say what actually ran.
 */
const LABELS: Record<string, string> = {
  resolve_ticker: 'Resolving the ticker',
  read_quote: 'Reading market data',
  read_candles: 'Reading price history',
  read_fundamentals: 'Reading company fundamentals',
  read_filings: 'Reading SEC filings',
  read_investor_relations: 'Reading company announcements',
  read_market_status: 'Checking the market session',
  read_attestation: 'Reading the backing report',
  find_across_venues: 'Looking across issuers',
  list_venues: 'Listing issuers',
  search_x: 'Searching X',
  classify_posts: 'Classifying posts',
  analyze_sentiment: 'Analysing sentiment',
  read_evidence: 'Re-reading collected posts',
  present_visualization: 'Preparing a diagram',
  find_assets: 'Finding the asset',
  analyze_posts: 'Analysing posts',
  read_company_updates: 'Reading company filings and announcements',
  read_prices: 'Reading prices across issuers',
  read_markets: 'Comparing markets',
  read_portfolio: 'Reading your portfolio',
  prepare_trade: 'Preparing the trade',
  check_claim: 'Checking the claim',
  analyze_trade: 'Weighing the signals',
  compose_answer: 'Writing the answer',
}

export const stepLabel = (step: ActivityStep): string => {
  const base = LABELS[step.code] ?? 'Working'
  // Counts describe live progress for a running step. On a completed step,
  // the result belongs on its own line below the title.
  if (step.status !== 'running' || step.count == null) return base
  // Keep live progress counts visibly attached to the operation being described.
  if (step.total != null) return `${base} · ${step.count}/${step.total}`
  return `${base} · ${step.count}`
}

/**
 * The one line shown when the timeline is collapsed.
 *
 * A failure outranks everything: the reason somebody opens this is usually that
 * something did not work, and a summary that says "4 steps" above a failed run
 * has buried the only interesting fact.
 */
export const summarise = (steps: readonly ActivityStep[]): string => {
  if (!steps.length) return 'No tools ran'
  const failed = steps.filter((step) => step.status === 'failed')
  if (failed.length) return `${failed.length} step${failed.length > 1 ? 's' : ''} failed`
  const running = steps.find((step) => step.status === 'running')
  if (running) return stepLabel(running)
  const cancelled = steps.filter((step) => step.status === 'cancelled')
  if (cancelled.length) return 'Stopped part way'
  return `${steps.length} step${steps.length > 1 ? 's' : ''}`
}

/** A short, user-facing outcome for a completed tool call. */
export const stepResult = (step: ActivityStep): string | undefined => {
  if (step.status === 'failed') return 'Failed'
  if (step.status === 'cancelled' || step.status === 'interrupted') return 'Stopped'
  if (step.status !== 'completed') return undefined

  switch (step.code) {
    case 'resolve_ticker':
      return 'Ticker resolved'
    case 'read_quote':
      return 'Quote loaded'
    case 'read_candles':
      return 'Price history loaded'
    case 'read_fundamentals':
      return 'Company fundamentals loaded'
    case 'read_filings':
      return 'SEC filings loaded'
    case 'read_investor_relations':
      return 'Company updates loaded'
    case 'read_market_status':
      return 'Market session checked'
    case 'read_attestation':
      return 'Backing details loaded'
    case 'find_across_venues':
      return 'Issuer matches found'
    case 'list_venues':
      return 'Issuers listed'
    case 'search_x':
      if (step.count === 0) return 'No posts found'
      if (step.count === 1) return '1 post found'
      return step.count == null ? 'Search completed' : `${step.count} posts found`
    case 'classify_posts':
      return 'Posts classified'
    case 'analyze_sentiment':
      return 'Sentiment analyzed'
    case 'read_evidence':
      return 'Evidence reviewed'
    case 'present_visualization':
      return 'Visualization prepared'
    case 'find_assets':
      return 'Assets found'
    case 'analyze_posts':
      return 'Posts analysed'
    case 'read_company_updates':
      return 'Company updates loaded'
    case 'read_prices':
      return 'Prices loaded'
    case 'read_markets':
      return 'Markets compared'
    case 'read_portfolio':
      return 'Portfolio loaded'
    case 'prepare_trade':
      return 'Trade ready to review'
    case 'check_claim':
      return 'Claim checked'
    case 'analyze_trade':
      return 'Analysis ready'
    case 'compose_answer':
      // The title already says this; an extra “Answer ready” line adds no detail.
      return undefined
    default:
      return 'Completed'
  }
}

/* ------------------------------------------------- Summary shape */

/**
 * `summarizeAgentActivity`, matching the signature the copied `ActionTimeline`
 * imports.
 *
 * A live-stream version collapses a live event stream — many events per tool call,
 * latest wins, keyed by `toolCallId:stepKey`. The server here has already done
 * that collapsing, so `toActivityEvents` emits exactly one event per step and
 * this reduction is a no-op that preserves order. Keeping the shape means the
 * timeline file needed no edit beyond its imports.
 *
 * `resultsLabel` is what the row says under its title: a useful result or a
 * failure state, never a per-step duration.
 */
export const summarizeAgentActivity = (
  events: readonly AgentActivityEvent[]
): SummarizedActivity[] => {
  const latest = new Map<string, AgentActivityEvent>()
  // `__start__` exists only to anchor the elapsed span; it is not a step.
  for (const event of events) {
    if (event.stepKey === '__start__') continue
    latest.set(`${event.toolCallId}:${event.stepKey}`, event)
  }

  return [...latest].map(([id, event]) => ({
    id,
    summary: {
      state: event.phase === 'checkpoint' ? ('done' as const) : ('running' as const),
      title: event.safeData?.title ?? event.code,
      resultsLabel: event.safeData?.resultsLabel,
      failed: event.safeData?.failed,
    },
  }))
}

/**
 * `toolTitles`, the name `AgentRunStatusRow` imports.
 *
 * A live-stream design keys this by its own tool names; ours is keyed by the activity codes
 * the server allowlists, which is the same idea with a different vocabulary.
 * Exported under their name so the copied row needed no edit.
 */
export const toolTitles: Record<string, string> = LABELS

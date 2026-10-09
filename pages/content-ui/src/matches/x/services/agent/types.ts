import type { ResearchUIMessage } from '@extension/shared'

/**
 * The Agent wire contract, mirrored from `optimai-agentic-server/src/app/agent/schemas.py`.
 *
 * Hand-written rather than generated, and therefore worth keeping honest: a
 * field that drifts here becomes a run that waits for a tool call it cannot see.
 */

export type RunState =
  | 'queued'
  | 'running'
  | 'waiting_for_tools'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'expired'

export type ExecutionState =
  | 'pending'
  | 'claimed'
  | 'executing'
  | 'submitted'
  | 'accepted'
  | 'cancelled'
  | 'interrupted'

export const ACTIVE_RUN_STATES: readonly RunState[] = [
  'queued',
  'running',
  'waiting_for_tools',
] as const

export interface AssetContext {
  ticker?: string
  symbol?: string
  company_name?: string
  provider?: string
  chain_id?: string
  contract_address?: string
}

export interface EvidenceHint {
  evidence_id: string
  query: string
  collected_at: string
  post_count: number
}

export interface BrowserCapability {
  executor_id: string
  x_search_available: boolean
  current_query?: string
  current_mode?: 'latest' | 'top'
}

export interface CreateConversationResponse {
  conversation_id: string
  capability: string
  expires_at: string
}

/** The wallets the panel has connected. The model never supplies these. */
export interface TurnWallets {
  bnb?: string | null
  solana?: string | null
}

export interface SubmitTurnRequest {
  client_message_id: string
  question: string
  /**
   * Sent with the turn rather than accepted as a tool argument.
   *
   * The agent reads posts off X, which are untrusted input. A tool taking an
   * address as a parameter would let an injected "check 0x…" read a stranger's
   * holdings into the answer; an address the user did not connect is not
   * reachable from the server at all.
   */
  wallets?: TurnWallets
  /** The issuer tab the question was asked from, and for Ondo which listing. */
  venue?: string
  chain?: string
  asset_context?: AssetContext[]
  available_evidence?: EvidenceHint[]
  browser: BrowserCapability
}

export interface SubmitTurnResponse {
  run_id: string
  revision: number
  state: RunState
}

export interface ActivityEvent {
  seq: number
  at: string
  kind: 'thinking' | 'tool_started' | 'tool_finished' | 'tool_failed' | 'answering'
  tool: string | null
  detail: string | null
}

export interface SearchXArgs {
  query: string
  mode: 'latest' | 'top'
  published_after?: string | null
  published_before?: string | null
  max_posts: number
  freshness: 'allow_recent_cache' | 'refresh'
}

export interface PendingToolCall {
  tool_call_id: string
  name: 'search_x'
  arguments: SearchXArgs
  state: ExecutionState
  execution_id: string | null
  lease_expires_at: string | null
}

export interface Citation {
  source_id: string
  kind: 'x_post' | 'market_data' | 'issuer_data'
  title: string
  url: string | null
  observed_at: string
}

export interface AgentAnswer {
  message_id: string
  /** The paragraphs only, joined. Cards and their places are in `ui_message`. */
  text: string
  citations: Citation[]
  limitations: string[]
  outcome: 'answer' | 'clarification'
}

export interface RunFailure {
  code: string
  message: string
  retryable: boolean
}

export interface RunStatus {
  run_id: string
  conversation_id: string
  state: RunState
  revision: number
  activity: ActivityEvent[]
  pending_tools: PendingToolCall[]
  answer: AgentAnswer | null
  /**
   * The rich answer projection. Activity is live, while selected presentation
   * parts appear only when the completed answer includes them. `answer` stays
   * alongside for panels that read only the plain text.
   */
  ui_message: ResearchUIMessage | null
  failure: RunFailure | null
  expires_at: string
}

export interface ClaimResponse {
  tool_call_id: string
  execution_id: string
  lease_expires_at: string
  arguments: SearchXArgs
}

export interface HeartbeatResponse {
  state: RunState
  lease_expires_at: string
  cancelled: boolean
}

export interface ResearchAuthor {
  handle: string
  name: string
  followers?: number | null
  verified: boolean
  /** As X served it. The panel allowlists it again before rendering. */
  avatar_url?: string | null
}

export interface ResearchPost {
  id: string
  url: string
  text: string
  published_at?: string | null
  observed_at: string
  author: ResearchAuthor
  tickers: string[]
  reposted_post_id?: string | null
  quoted_post_id?: string | null
  truncated: boolean
}

export interface BatchProvenance {
  capture_id: string
  query: string
  mode: 'latest' | 'top'
  requested_at: string
  received_at: string
  http_status: number
  posts: number
  cursor?: string | null
}

export interface ParseCoverage {
  entries: number
  tweet_entries: number
  unsupported_entries: number
  drift_reason?: string | null
}

export type SearchXStopReason =
  | 'target_reached'
  | 'timeline_exhausted'
  | 'no_progress'
  | 'time_budget'
  | 'step_budget'
  | 'cache_hit'
  | 'refresh_not_observed'
  | 'login_required'
  | 'rate_limited'
  | 'parser_drift'
  | 'navigation_failed'
  | 'interrupted'

export interface SearchXResult {
  evidence_id: string
  query: string
  effective_args: SearchXArgs
  status: 'ok' | 'partial' | 'error'
  stop_reason: SearchXStopReason
  started_at: string
  finished_at: string
  posts: ResearchPost[]
  batches: BatchProvenance[]
  coverage: ParseCoverage
  cache_age_seconds?: number | null
  warnings: string[]
}

export interface ToolResultResponse {
  accepted: boolean
  revision: number
  state: RunState
  duplicate: boolean
}

export interface CancelResponse {
  state: RunState
  revision: number
}

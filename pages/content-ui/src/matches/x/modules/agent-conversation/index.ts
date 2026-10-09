import { getSelection } from '@x/modules/venue'
import { useSyncExternalStore } from 'react'

import type { ParsedPart } from '@extension/shared'

import type {
  ActivityEvent,
  AssetContext,
  Citation,
  EvidenceHint,
  RunFailure,
  RunState,
} from '@x/services/agent'

/**
 * The transcript the user reads, and the draft they are writing.
 *
 * Not the model's history — that lives on the server, where it cannot be edited
 * by a page. What is here is what has to survive a tab change, a panel close and
 * a route change: messages with the context they were asked under, the sources
 * that answered them, and whatever is half-typed in the composer.
 *
 * Context belongs to a message, not to the conversation. Selecting a different
 * token must not relabel what somebody asked about the last one.
 */

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: number
  /** What was on screen when this message was sent. Never rewritten later. */
  assets?: AssetContext[]
  sources?: Citation[]
  limitations?: string[]
  /**
   * The parts the server sent, already validated.
   *
   * Stored parsed rather than raw so that a message which fails validation
   * fails once, here, instead of inside a renderer on every re-render. `text`
   * above stays populated as the prose fallback — one message, two
   * representations, never two messages.
   */
  parts?: ParsedPart[]
  status: 'pending' | 'complete' | 'cancelled' | 'interrupted' | 'error'
}

export interface AgentConversationState {
  conversationId: string | null
  capability: string | null
  messages: AgentMessage[]
  draft: string
  /** What the panel carried in from a token detail. Only a hint to the model. */
  assets: AssetContext[]
  activity: ActivityEvent[]
  runId: string | null
  runState: RunState | 'idle'
  failure: RunFailure | null
  evidence: EvidenceHint[]
  /** Set when the session expired or a reload interrupted a browser search. */
  recovery: 'none' | 'session_expired' | 'interrupted'
}

const INITIAL: AgentConversationState = {
  conversationId: null,
  capability: null,
  messages: [],
  draft: '',
  assets: [],
  activity: [],
  runId: null,
  runState: 'idle',
  failure: null,
  evidence: [],
  recovery: 'none',
}

let state = INITIAL
const listeners = new Set<() => void>()

const notify = () => listeners.forEach((listener) => listener())

export const updateAgentConversation = (
  patch: Partial<AgentConversationState>
): AgentConversationState => {
  state = { ...state, ...patch }
  notify()
  return state
}

export const appendAgentMessage = (message: AgentMessage): void => {
  updateAgentConversation({ messages: [...state.messages, message] })
}

export const patchAgentMessage = (id: string, patch: Partial<AgentMessage>): void => {
  updateAgentConversation({
    messages: state.messages.map((message) =>
      message.id === id ? { ...message, ...patch } : message
    ),
  })
}

export const mergeActivity = (events: ActivityEvent[]): void => {
  if (!events.length) return
  const bySeq = new Map(state.activity.map((event) => [event.seq, event]))
  for (const event of events) bySeq.set(event.seq, event)
  updateAgentConversation({
    activity: [...bySeq.values()].sort((left, right) => left.seq - right.seq).slice(-40),
  })
}

export const rememberEvidence = (hint: EvidenceHint): void => {
  const without = state.evidence.filter((existing) => existing.evidence_id !== hint.evidence_id)
  updateAgentConversation({ evidence: [...without, hint].slice(-12) })
}

/**
 * Attach a token's context, from a Token detail entry.
 *
 * Deliberately does not touch `draft` or `messages`: opening Agent from a token
 * is not a question, and the panel appearing must not send one. Nothing is
 * written into the composer at all now that the templated questions are gone.
 */
export const attachAssetContext = (asset: AssetContext): void => {
  // Stamped here rather than at the call site: whoever attaches a token knows
  // its ticker, not which issuer catalog the panel is reading it from — and a
  // ticker without its issuer is what made the agent answer about NVDAB while
  // the screen showed NVDAon.
  const selection = getSelection()
  const stamped: AssetContext = {
    ...asset,
    provider: asset.provider ?? selection.venue,
    chain_id: asset.chain_id ?? selection.chain,
  }
  const already = state.assets.some(
    (existing) =>
      existing.ticker === stamped.ticker &&
      existing.provider === stamped.provider &&
      existing.chain_id === stamped.chain_id
  )
  updateAgentConversation({
    assets: already ? state.assets : [...state.assets, stamped].slice(-3),
  })
}

/** A new conversation keeps nothing but the session it will open on demand. */
export const resetAgentConversation = (): void => {
  state = { ...INITIAL }
  notify()
}

export const subscribeAgentConversation = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getAgentConversationSnapshot = (): AgentConversationState => state

export const useAgentConversation = (): AgentConversationState =>
  useSyncExternalStore(
    subscribeAgentConversation,
    getAgentConversationSnapshot,
    getAgentConversationSnapshot
  )

/** Test seam. Nothing in the extension calls this. */
export const __resetConversationStore = (): void => {
  state = INITIAL
  listeners.clear()
}

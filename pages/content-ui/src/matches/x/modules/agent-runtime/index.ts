import { parseParts, API_ERROR_CODES } from '@extension/shared'
import { connectedWallets } from '@x/modules/wallet'
import {
  appendAgentMessage,
  getAgentConversationSnapshot,
  mergeActivity,
  patchAgentMessage,
  rememberEvidence,
  updateAgentConversation,
} from '@x/modules/agent-conversation'
import { abortActiveSearch, executeSearchX } from '@x/modules/research'
import { getSelection } from '@x/modules/venue'
import { CatalystApiError } from '@x/libs/catalyst'
import { agentService } from '@x/services/agent'
import type { AssetContext, PendingToolCall, RunStatus, SearchXResult } from '@x/services/agent'

/**
 * The half of a turn that must outlive the view.
 *
 * Collection takes tens of seconds and the user is expected to switch tabs while
 * it runs. If polling, claiming and delivery lived in a React effect, changing
 * panel tab would unmount the thing holding the run — and the old build did
 * exactly that, which is why a tab change could strand a search nobody would
 * ever collect.
 *
 * So this is a module singleton with an explicit lifecycle. React reads its
 * output through the conversation store and never owns it.
 */

const POLL_MS = 1_000
const POLL_BACKOFF_MS = 3_000
const HEARTBEAT_MS = 15_000

const executorId = `tab_${Math.random().toString(36).slice(2, 10)}`

interface Turn {
  runId: string
  capability: string
  messageId: string
  /** Cancels local browser work. The backend is told separately. */
  abort: AbortController
  cancelled: boolean
}

let turn: Turn | null = null
let poller: ReturnType<typeof setTimeout> | null = null
/** Tool calls this tab has already executed, so a replayed status cannot re-run one. */
const executed = new Set<string>()
/** Claims currently in flight; a slow relay must not produce two local claims. */
const claiming = new Set<string>()
/** Results collected but not yet acknowledged, retried with their original identity. */
const undelivered = new Map<
  string,
  { executionId: string; resultId: string; result: SearchXResult }
>()
let conversationCreationKey: string | null = null

const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

const stopPolling = () => {
  if (poller) clearTimeout(poller)
  poller = null
}

const isSessionGone = (error: unknown): boolean =>
  error instanceof CatalystApiError && error.code === API_ERROR_CODES.sessionExpired

const isRunCancelled = (error: unknown): boolean =>
  error instanceof CatalystApiError && error.code === API_ERROR_CODES.runCancelled

const isRetryableTransport = (error: unknown): boolean =>
  error instanceof CatalystApiError && (error.status === 0 || error.status >= 500)

/**
 * A 4xx the server means: it read the request and rejected it. A timeout (408)
 * or a rate limit (429) says try later, so those stay retryable.
 */
const isRefused = (error: unknown): boolean =>
  error instanceof CatalystApiError &&
  error.status >= 400 &&
  error.status < 500 &&
  error.status !== 408 &&
  error.status !== 429

const isNonOwningClaimError = (error: unknown): boolean =>
  error instanceof CatalystApiError &&
  (error.code === API_ERROR_CODES.claimConflict ||
    error.code === API_ERROR_CODES.resultConflict ||
    error.code === API_ERROR_CODES.runCancelled ||
    error.code === API_ERROR_CODES.sessionExpired)

/**
 * Open a conversation, or reuse the one this tab already has.
 *
 * The capability is created once and kept. Creation is idempotent on the server,
 * so a retry after a dropped acknowledgement rejoins the same session instead of
 * silently starting a second one.
 */
const ensureConversation = async (): Promise<{ id: string; capability: string }> => {
  const current = getAgentConversationSnapshot()
  if (current.conversationId && current.capability) {
    return { id: current.conversationId, capability: current.capability }
  }
  conversationCreationKey ??= newId('idem')
  const { data } = await agentService.createConversation(conversationCreationKey)
  updateAgentConversation({
    conversationId: data.conversation_id,
    capability: data.capability,
    recovery: 'none',
  })
  return { id: data.conversation_id, capability: data.capability }
}

const cancelBackendRun = async (active: Turn, reason: string): Promise<void> => {
  try {
    await agentService.cancel(active.runId, active.capability, reason, newId('cancel'))
  } catch {
    // The local browser must still stop if the relay is unavailable. The server
    // also has a stale-run guard for a cancel that cannot cross the page unload.
  }
}

const failTurn = async (message: string, code?: string): Promise<void> => {
  const active = turn
  if (!active || active.cancelled) return
  active.cancelled = true
  active.abort.abort('browser_failed')
  abortActiveSearch('browser_failed')
  await cancelBackendRun(active, 'browser_failed')
  patchAgentMessage(active.messageId, { status: 'error', text: message })
  updateAgentConversation({
    runState: 'failed',
    failure: { code: code ?? 'TRANSPORT', message, retryable: true },
  })
  finish()
}

/**
 * Execute one `search_x` the model asked for, and deliver the result.
 *
 * Claim first, so two tabs cannot drive the same page. Heartbeat while
 * collecting, so a tab that dies stops owning the claim. Deliver with a stable
 * result ID, so a dropped acknowledgement is a retry rather than a second
 * search.
 */
const runPendingCall = async (active: Turn, call: PendingToolCall): Promise<void> => {
  if (executed.has(call.tool_call_id) || claiming.has(call.tool_call_id)) return
  claiming.add(call.tool_call_id)

  let executionId: string
  try {
    const { data } = await agentService.claim(
      active.runId,
      active.capability,
      call.tool_call_id,
      executorId
    )
    executionId = data.execution_id
  } catch (error) {
    // Another tab owns it, or the result was accepted while this request was in
    // flight. Neither case is ours to execute. Transport failures are rethrown
    // without poisoning `executed`, so the next poll can retry the claim.
    if (isNonOwningClaimError(error)) return
    throw error
  } finally {
    claiming.delete(call.tool_call_id)
  }
  executed.add(call.tool_call_id)

  let collected = 0
  const heartbeat = setInterval(() => {
    void agentService
      .heartbeat(active.runId, active.capability, {
        tool_call_id: call.tool_call_id,
        execution_id: executionId,
        collected,
      })
      .then(({ data }) => {
        if (data.cancelled) active.abort.abort('cancelled')
      })
      .catch(() => undefined)
  }, HEARTBEAT_MS)

  let result: SearchXResult
  try {
    result = await executeSearchX(call.arguments, {
      signal: active.abort.signal,
      onProgress: (count) => {
        collected = count
      },
    })
  } finally {
    clearInterval(heartbeat)
  }

  const resultId = newId('res')
  undelivered.set(call.tool_call_id, { executionId, resultId, result })
  rememberEvidence({
    evidence_id: result.evidence_id,
    query: result.query,
    collected_at: result.finished_at,
    post_count: result.posts.length,
  })
  await deliver(active, call.tool_call_id)
}

const deliver = async (active: Turn, toolCallId: string): Promise<void> => {
  const pending = undelivered.get(toolCallId)
  if (!pending) return
  try {
    await agentService.deliver(active.runId, active.capability, {
      tool_call_id: toolCallId,
      execution_id: pending.executionId,
      result_id: pending.resultId,
      result: pending.result,
    })
    undelivered.delete(toolCallId)
  } catch (error) {
    if (isRunCancelled(error) || isSessionGone(error)) {
      // The run is gone. Retrying delivery forever would keep a dead turn alive.
      undelivered.delete(toolCallId)
      return
    }
    if (isNonOwningClaimError(error)) {
      // Another executor owns this call, or its result already landed. Not ours
      // to send, and not a reason to stop a turn that is still going.
      undelivered.delete(toolCallId)
      return
    }
    if (isRefused(error)) {
      // The server read the result and said no. The same bytes will get the
      // same answer, so resending them is how a turn sat on "Searching X"
      // forever with nothing on screen to say why.
      undelivered.delete(toolCallId)
      await failTurn(
        'The search finished, but the research service refused its result. Ask again to retry.',
        'RESULT_REFUSED'
      )
      return
    }
    // Anything else is a transport failure: keep the result and try again on the
    // next poll, with the same result ID so the server can recognise it.
  }
}

const applyStatus = (status: RunStatus): void => {
  mergeActivity(status.activity)
  updateAgentConversation({ runState: status.state, failure: status.failure })

  const active = turn
  if (!active) return

  // Activity updates while the run is active. Presentation parts are withheld
  // until the final answer has selected them, then arrive in their final order.
  const parts = parseParts(status.ui_message)
  if (parts.length) {
    patchAgentMessage(active.messageId, { parts })
  }

  if (status.answer) {
    patchAgentMessage(active.messageId, {
      status: 'complete',
      // The paragraphs, joined by the server. The fallback for a message whose
      // typed parts could not be read.
      text: status.answer.text,
      sources: status.answer.citations,
      limitations: status.answer.limitations,
    })
  } else if (status.state === 'failed') {
    patchAgentMessage(active.messageId, {
      status: 'error',
      text: status.failure?.message ?? 'The turn could not be completed.',
    })
  } else if (status.state === 'cancelled') {
    patchAgentMessage(active.messageId, {
      status: 'cancelled',
      text: 'Stopped before an answer was written.',
    })
  }
}

const isTerminal = (status: RunStatus): boolean =>
  status.state === 'completed' ||
  status.state === 'cancelled' ||
  status.state === 'failed' ||
  status.state === 'expired'

const poll = async (): Promise<void> => {
  const active = turn
  if (!active) return

  let status: RunStatus
  try {
    const { data } = await agentService.readRun(active.runId, active.capability)
    status = data
  } catch (error) {
    if (isSessionGone(error)) {
      conversationCreationKey = null
      updateAgentConversation({
        conversationId: null,
        capability: null,
        runId: null,
        runState: 'expired',
        recovery: 'session_expired',
      })
      patchAgentMessage(active.messageId, {
        status: 'interrupted',
        text: 'The research session expired before this answer was written.',
      })
      finish()
      return
    }
    // A transport failure proves nothing about the run. Back off and ask again.
    poller = setTimeout(() => void poll(), POLL_BACKOFF_MS)
    return
  }

  applyStatus(status)

  // Retry anything collected but not acknowledged, before doing new work.
  for (const toolCallId of [...undelivered.keys()]) {
    await deliver(active, toolCallId)
  }

  if (!active.cancelled) {
    // Sequential: one browser tab, one search at a time. Two of these driving
    // the same page would fight over scrolling.
    for (const call of status.pending_tools) {
      if (active.cancelled) break
      if (call.state === 'pending' || call.state === 'claimed' || call.state === 'executing') {
        try {
          await runPendingCall(active, call)
        } catch (error) {
          if (isRetryableTransport(error)) {
            poller = setTimeout(() => void poll(), POLL_BACKOFF_MS)
            return
          }
          await failTurn('The browser could not complete the search.')
          return
        }
      }
    }
  }

  if (isTerminal(status)) {
    finish()
    return
  }
  poller = setTimeout(() => void poll(), POLL_MS)
}

const finish = () => {
  stopPolling()
  turn = null
  executed.clear()
  claiming.clear()
  undelivered.clear()
}

/**
 * Send a question.
 *
 * The user's message is appended locally first, with a stable ID that is also
 * the idempotency key: a retried submission joins the same turn instead of
 * asking twice.
 */
export const submitQuestion = async (
  question: string,
  assets: AssetContext[] = []
): Promise<void> => {
  if (turn) return
  const trimmed = question.trim()
  if (!trimmed) return

  const clientMessageId = newId('msg')
  const answerId = `${clientMessageId}_answer`

  appendAgentMessage({
    id: clientMessageId,
    role: 'user',
    text: trimmed,
    at: Date.now(),
    assets,
    status: 'complete',
  })
  appendAgentMessage({
    id: answerId,
    role: 'assistant',
    text: '',
    at: Date.now(),
    status: 'pending',
  })
  updateAgentConversation({ draft: '', failure: null, activity: [], runState: 'queued' })

  let session: { id: string; capability: string }
  try {
    session = await ensureConversation()
  } catch (error) {
    patchAgentMessage(answerId, {
      status: 'error',
      text:
        error instanceof Error
          ? `Could not reach the research service: ${error.message}`
          : 'Could not reach the research service.',
    })
    updateAgentConversation({ runState: 'idle' })
    return
  }

  const snapshot = getAgentConversationSnapshot()
  try {
    // Which issuer tab the question was asked from. Stamped per turn rather
    // than per conversation: somebody can switch from bStocks to Ondo between
    // two questions, and the answer has to come from the catalog now on screen.
    const selection = getSelection()
    const { data } = await agentService.submitTurn(session.id, session.capability, {
      client_message_id: clientMessageId,
      question: trimmed,
      venue: selection.venue,
      chain: selection.chain,
      // Stamped here, never accepted as a tool argument. The agent reads posts
      // off X and those are untrusted: a tool taking an address as a parameter
      // would let an injected "check 0x…" put a stranger's holdings in the
      // answer. Only what the user actually connected is reachable.
      wallets: connectedWallets(),
      asset_context: assets,
      available_evidence: snapshot.evidence,
      browser: {
        executor_id: executorId,
        x_search_available: true,
        current_query: currentSearch()?.query,
        current_mode: currentSearch()?.mode,
      },
    })
    turn = {
      runId: data.run_id,
      capability: session.capability,
      messageId: answerId,
      abort: new AbortController(),
      cancelled: false,
    }
    updateAgentConversation({ runId: data.run_id, runState: data.state })
    stopPolling()
    poller = setTimeout(() => void poll(), 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The question could not be submitted.'
    patchAgentMessage(answerId, { status: 'error', text: message })
    updateAgentConversation({ runState: 'idle' })
  }
}

const currentSearch = (): { query: string; mode: 'latest' | 'top' } | undefined => {
  if (window.location.pathname !== '/search') return undefined
  const params = new URLSearchParams(window.location.search)
  const query = params.get('q')
  if (!query) return undefined
  return { query, mode: params.get('f') === 'live' ? 'latest' : 'top' }
}

/**
 * Stop everything this turn is doing: the scroll, the overlay, the model.
 *
 * Local work stops first so the page comes back under the user's control even if
 * the backend call is slow or fails.
 */
export const stopTurn = async (reason = 'user_stopped'): Promise<void> => {
  const active = turn
  abortActiveSearch(reason)
  if (!active) return
  active.cancelled = true
  active.abort.abort(reason)
  await cancelBackendRun(active, reason)
  updateAgentConversation({ runState: 'cancelled' })
  patchAgentMessage(active.messageId, {
    status: 'cancelled',
    text: 'Stopped before an answer was written.',
  })
  finish()
}

export const isTurnActive = (): boolean => turn !== null

/** Called when the panel unmounts for good. Leaves no timer behind. */
export const shutdownRunController = (): void => {
  if (turn) {
    // React cleanup is synchronous, but cancellation is deliberately sent in
    // the background so a document reload tells the server to stop its run.
    void stopTurn('unmounted')
    return
  }
  abortActiveSearch('unmounted')
  stopPolling()
}

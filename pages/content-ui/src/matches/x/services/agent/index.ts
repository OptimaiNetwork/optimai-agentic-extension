import catalystClient from '@x/libs/catalyst'

import type {
  CancelResponse,
  ClaimResponse,
  CreateConversationResponse,
  HeartbeatResponse,
  RunStatus,
  SearchXResult,
  SubmitTurnRequest,
  SubmitTurnResponse,
  ToolResultResponse,
} from './types'

/**
 * Short requests only.
 *
 * Nothing here waits for the model to think or for a page to be scrolled: a turn
 * is a background job on the server and a collection run is a background job in
 * this tab. Both are polled. A relay timeout therefore never means the work
 * failed — only that this particular acknowledgement did not arrive.
 */
const TIMEOUT_MS = 12_000

export const agentService = {
  createConversation(idempotencyKey: string, locale?: string) {
    return catalystClient.post<CreateConversationResponse>(
      '/agent/conversations',
      { idempotency_key: idempotencyKey, locale },
      { timeoutMs: TIMEOUT_MS }
    )
  },

  submitTurn(conversationId: string, capability: string, body: SubmitTurnRequest) {
    return catalystClient.post<SubmitTurnResponse>(
      `/agent/conversations/${encodeURIComponent(conversationId)}/turns`,
      body,
      { capability, timeoutMs: TIMEOUT_MS }
    )
  },

  readRun(runId: string, capability: string, since?: number) {
    return catalystClient.get<RunStatus>(`/agent/runs/${encodeURIComponent(runId)}`, {
      capability,
      params: since === undefined ? undefined : { since },
      timeoutMs: TIMEOUT_MS,
    })
  },

  claim(runId: string, capability: string, toolCallId: string, executorId: string) {
    return catalystClient.post<ClaimResponse>(
      `/agent/runs/${encodeURIComponent(runId)}/tool-claims`,
      { tool_call_id: toolCallId, executor_id: executorId },
      { capability, timeoutMs: TIMEOUT_MS }
    )
  },

  heartbeat(
    runId: string,
    capability: string,
    body: { tool_call_id: string; execution_id: string; collected: number; detail?: string }
  ) {
    return catalystClient.post<HeartbeatResponse>(
      `/agent/runs/${encodeURIComponent(runId)}/tool-heartbeats`,
      body,
      { capability, timeoutMs: TIMEOUT_MS }
    )
  },

  /** Idempotent by `resultId`: a redelivery is acknowledged, never re-executed. */
  deliver(
    runId: string,
    capability: string,
    body: {
      tool_call_id: string
      execution_id: string
      result_id: string
      result: SearchXResult
    }
  ) {
    return catalystClient.post<ToolResultResponse>(
      `/agent/runs/${encodeURIComponent(runId)}/tool-results`,
      body,
      { capability, timeoutMs: TIMEOUT_MS }
    )
  },

  cancel(runId: string, capability: string, reason: string, idempotencyKey: string) {
    return catalystClient.post<CancelResponse>(
      `/agent/runs/${encodeURIComponent(runId)}/cancel`,
      { reason, idempotency_key: idempotencyKey },
      { capability, timeoutMs: TIMEOUT_MS }
    )
  },
}

export type * from './types'

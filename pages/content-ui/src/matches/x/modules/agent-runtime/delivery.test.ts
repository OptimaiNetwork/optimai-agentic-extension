/**
 * What happens to a search result the server will not take.
 *
 * A refused delivery used to be treated like a dropped connection: kept, and
 * sent again on every poll, forever. The server refused X's long search cursors
 * with a 422, so a search that scrolled past its first page never landed and
 * the turn sat on "Searching X" with nothing on screen to say why. A refusal is
 * an answer; a transport failure is not. These tests hold that line.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const agentService = vi.hoisted(() => ({
  createConversation: vi.fn(),
  submitTurn: vi.fn(),
  readRun: vi.fn(),
  claim: vi.fn(),
  heartbeat: vi.fn(),
  deliver: vi.fn(),
  cancel: vi.fn(),
}))
const conversation = vi.hoisted(() => ({
  appendAgentMessage: vi.fn(),
  getAgentConversationSnapshot: vi.fn(() => ({
    conversationId: null,
    capability: null,
    evidence: [],
  })),
  mergeActivity: vi.fn(),
  patchAgentMessage: vi.fn(),
  rememberEvidence: vi.fn(),
  updateAgentConversation: vi.fn(),
}))
const research = vi.hoisted(() => ({ executeSearchX: vi.fn(), abortActiveSearch: vi.fn() }))

vi.mock('@x/services/agent', () => ({ agentService }))
vi.mock('@x/modules/agent-conversation', () => conversation)
vi.mock('@x/modules/research', () => research)
vi.mock('@x/modules/wallet', () => ({ connectedWallets: () => undefined }))
vi.mock('@x/modules/venue', () => ({ getSelection: () => ({ venue: 'ondo', chain: 'solana' }) }))

const RESULT = {
  evidence_id: 'ev_1',
  query: 'NVIDIA',
  finished_at: '2026-09-24T10:00:00Z',
  posts: [],
}

const waitingStatus = {
  run_id: 'run_1',
  state: 'waiting_for_tools',
  activity: [],
  pending_tools: [
    { tool_call_id: 'call_1', name: 'search_x', arguments: { query: 'NVIDIA' }, state: 'pending' },
  ],
  answer: null,
  ui_message: null,
  failure: null,
}

/** The error class as the freshly imported runtime sees it; `resetModules` gives each test its own. */
const apiError = async (message: string, status: number) => {
  const { CatalystApiError } = await import('@x/libs/catalyst')
  return new CatalystApiError(message, status)
}

const flush = async (ms: number) => {
  await vi.advanceTimersByTimeAsync(ms)
}

describe('delivering a search result', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    for (const fn of [...Object.values(agentService), ...Object.values(conversation)]) {
      ;(fn as ReturnType<typeof vi.fn>).mockReset?.()
    }
    conversation.getAgentConversationSnapshot.mockReturnValue({
      conversationId: null,
      capability: null,
      evidence: [],
    })
    agentService.createConversation.mockResolvedValue({
      data: { conversation_id: 'conv_1', capability: 'cap' },
    })
    agentService.submitTurn.mockResolvedValue({ data: { run_id: 'run_1', state: 'queued' } })
    agentService.readRun.mockResolvedValue({ data: waitingStatus })
    agentService.claim.mockResolvedValue({ data: { execution_id: 'exec_1' } })
    agentService.heartbeat.mockResolvedValue({ data: { cancelled: false } })
    agentService.cancel.mockResolvedValue({ data: {} })
    research.executeSearchX.mockResolvedValue(RESULT)
  })

  afterEach(async () => {
    const { shutdownRunController } = await import('./index')
    shutdownRunController()
    vi.useRealTimers()
  })

  it('stops the turn and says so when the server refuses the result', async () => {
    agentService.deliver.mockRejectedValue(
      await apiError('String should have at most 200 characters', 422)
    )
    const { submitQuestion, isTurnActive } = await import('./index')

    await submitQuestion('What is X saying about NVIDIA')
    await flush(250)

    expect(agentService.deliver).toHaveBeenCalledTimes(1)
    expect(conversation.patchAgentMessage).toHaveBeenCalledWith(
      expect.stringMatching(/_answer$/),
      expect.objectContaining({ status: 'error', text: expect.stringMatching(/refused/i) })
    )
    expect(agentService.cancel).toHaveBeenCalled()
    expect(isTurnActive()).toBe(false)

    // Nothing left polling or redelivering behind it.
    await flush(10_000)
    expect(agentService.deliver).toHaveBeenCalledTimes(1)
  })

  it('keeps the result and sends it again after a transport failure', async () => {
    agentService.deliver
      .mockRejectedValueOnce(await apiError('network down', 0))
      .mockResolvedValue({ data: { accepted: true } })
    const { submitQuestion, isTurnActive } = await import('./index')

    await submitQuestion('What is X saying about NVIDIA')
    await flush(250)
    expect(agentService.deliver).toHaveBeenCalledTimes(1)
    expect(isTurnActive()).toBe(true)

    await flush(1_100)
    expect(agentService.deliver).toHaveBeenCalledTimes(2)
    expect(agentService.deliver.mock.calls[1][2].result_id).toBe(
      agentService.deliver.mock.calls[0][2].result_id
    )
    expect(conversation.patchAgentMessage).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'error' })
    )
  })
})

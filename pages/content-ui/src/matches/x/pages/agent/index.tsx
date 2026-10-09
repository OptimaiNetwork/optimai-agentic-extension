import {
  attachAssetContext,
  resetAgentConversation,
  updateAgentConversation,
  useAgentConversation,
} from '@x/modules/agent-conversation'
import { isTurnActive, stopTurn, submitQuestion } from '@x/modules/agent-runtime'
import { useSelectedChain } from '@x/modules/venue'
import type { AgentNavigationState } from '@x/routers/paths'
import { CHAINS } from '@extension/shared'
import { cn } from '@extension/ui'
import { Bot, Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { AssetChip } from './components/asset-chip'
import { AgentEmptyState } from './components/empty-state'
import { AgentRunStatusRow } from './components/agent-run-status'
import { toRunStatus } from './components/view-contract'
import { MessageScroller } from './components/message-scroller'
import { PromptInput } from './components/prompt-input'
import { MessageBubble } from './message-bubble'
import { suggestionsFor } from './suggestions'

const ACTIVE = new Set(['queued', 'running', 'waiting_for_tools'])

const AgentPage = () => {
  const { cashtag } = useParams<{ cashtag?: string }>()
  const location = useLocation()
  const entry = location.state as AgentNavigationState | null
  const conversation = useAgentConversation()
  const chainLabel = CHAINS[useSelectedChain()].label
  const applied = useRef<string | null>(null)

  const busy = ACTIVE.has(conversation.runState) || isTurnActive()
  // The pending assistant turn owns live status; older timeline rows belong to
  // earlier turns and must not hide it.
  const hasPendingAssistant = conversation.messages.some(
    (message) => message.role === 'assistant' && message.status === 'pending'
  )

  /**
   * A detail entry attaches context, and nothing else. It never writes a prompt
   * and never sends one — the panel appearing is not a question. What the token
   * buys is the suggestion set below, which is offered and not applied.
   */
  useEffect(() => {
    const requestId = entry?.requestId ?? location.key
    if (applied.current === requestId) return
    applied.current = requestId

    const ticker = (entry?.ticker ?? cashtag)?.replace(/^\$/, '').toUpperCase()
    if (!ticker) return
    attachAssetContext({ ticker, symbol: entry?.symbol, company_name: entry?.companyName })
  }, [cashtag, entry, location.key])

  const send = () => {
    if (busy) return
    void submitQuestion(conversation.draft, conversation.assets)
  }

  const startOver = () => {
    void stopTurn('new_conversation').finally(() => resetAgentConversation())
  }

  const hasTranscript = conversation.messages.length > 0

  /**
   * Nothing has happened yet — no transcript, no run, nothing to recover.
   *
   * Stricter than `!hasTranscript` on purpose. A run can be live before its
   * first message part lands, and a restored checkpoint can carry a recovery
   * notice; both need the scroller and the header, and neither is a new chat.
   */
  const isNewChat = !hasTranscript && !busy && conversation.recovery === 'none'

  // `ticker` is optional on `AssetContext` — the field is how a restored
  // checkpoint or a partial context arrives, and a suggestion set built around
  // `undefined` would read "What recent news matters for undefined?".
  const asset = conversation.assets[0]
  const suggestions = asset?.ticker
    ? suggestionsFor(asset.ticker, asset.symbol, asset.company_name)
    : /* No token came in with the panel, so there is no question to template —
         the empty state says what to ask instead of guessing at a ticker. */
      []

  return (
    <div className="bg-brown/90 flex h-full w-full flex-col border-l border-white/10 shadow-2xl backdrop-blur-lg">
      {/* The header is what a conversation has, not what one starts with. On a
          new chat the mark and the title below do its job, one screen instead
          of two competing ones. */}
      {!isNewChat && (
        <header className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* `/10`, not `/12`: Tailwind 3's opacity scale has no 12 step and the
                bare modifier emits nothing, so the plate silently had no fill. */}
            <span className="bg-brand/10 text-brand flex size-7 items-center justify-center rounded-xl">
              <Bot className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-13 text-foreground font-semibold leading-tight tracking-tight">
                Agent
              </div>
              <div className="text-11 text-faint truncate leading-tight">
                Research over X and {chainLabel} data
              </div>
            </div>
          </div>
          {/* The token the conversation is about, as a chip the eye lands on
              before the transcript. It replaces the "Context: NVDA" line that
              used to hang under every question. */}
          {asset?.ticker && <AssetChip ticker={asset.ticker} />}
          <button
            type="button"
            onClick={startOver}
            aria-label="Start a new conversation"
            className="text-faint hover:text-foreground hover:bg-surface rounded-lg p-1.5 transition-colors">
            <Plus className="size-4" />
          </button>
        </header>
      )}

      {isNewChat ? (
        /* Centred in the space the composer leaves, not centred with it. The
           composer stays pinned to the bottom edge in both states. */
        <div className="scrollable flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto py-6">
          <AgentEmptyState
            asset={asset}
            suggestions={suggestions}
            onPick={(suggestion) => updateAgentConversation({ draft: suggestion.prompt })}
          />
        </div>
      ) : (
        <MessageScroller
          className="w-full p-3"
          dependency={`${conversation.messages.length}:${conversation.activity.length}:${busy}`}>
          <div className="flex flex-col gap-3">
            {conversation.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                runEvents={
                  busy && message.role === 'assistant' && message.status === 'pending'
                    ? conversation.activity
                    : undefined
                }
              />
            ))}
            {/* A restored in-flight run can exist without its pending message. */}
            {busy && !hasPendingAssistant && (
              <AgentRunStatusRow
                status={toRunStatus(
                  conversation.runId ?? 'pending',
                  'running',
                  [],
                  conversation.activity
                )}
              />
            )}
            {/* A divider, not an amber box. Nothing is broken and nothing needs
                doing; the line just says where one session stopped. */}
            {conversation.recovery === 'session_expired' && (
              <RecoveryDivider>Session ended · next question starts fresh</RecoveryDivider>
            )}
            {conversation.recovery === 'interrupted' && (
              <RecoveryDivider>
                Search interrupted by a reload · ask again to resume
              </RecoveryDivider>
            )}
          </div>
        </MessageScroller>
      )}

      {/* No rule above the composer on a new chat: there is nothing above it to
          divide from, and the line read as the bottom of an empty box.

          It keeps this one place in the tree in both states — pinned to the
          bottom edge. Moving it into the block above would also remount the
          textarea the moment the first message lands, losing focus exactly as
          somebody starts typing the follow-up. */}
      <div className={cn('flex-shrink-0 p-3', !isNewChat && 'border-t border-white/10')}>
        <PromptInput
          value={conversation.draft}
          onValueChange={(draft) => updateAgentConversation({ draft })}
          onSubmit={send}
          loading={busy}
          maxLength={2000}
          placeholder="Ask about news, a company, or a token…"
          aria-label="Ask Agent"
        />
      </div>
    </div>
  )
}

const RecoveryDivider = ({ children }: { children: string }) => (
  <div
    role="status"
    className="text-11 text-faint/80 flex items-center gap-2.5 py-1 leading-[14px]">
    <span aria-hidden className="bg-border-soft h-px flex-1" />
    <span className="whitespace-nowrap">{children}</span>
    <span aria-hidden className="bg-border-soft h-px flex-1" />
  </div>
)

export default AgentPage

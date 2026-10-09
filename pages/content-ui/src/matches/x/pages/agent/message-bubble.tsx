import type { AgentMessage } from '@x/modules/agent-conversation'
import type { ActivityEvent, Citation } from '@x/services/agent'
import { cn } from '@extension/ui'

import { ActionTimeline } from './components/action-timeline'
import { AgentRunStatusRow } from './components/agent-run-status'
import { FlowRenderer } from './components/flow-renderer'
import { MarkdownContent } from './components/markdown-content'
import { Message, MessageContent } from './components/message'
import { MessageBubble as Bubble, MessageBubbleContent } from './components/message-bubble'
import { toActivityEvents, toRunStatus } from './components/view-contract'
import { ResearchCardRenderer, UnavailableSlot } from './components/research-card-renderer'
import { SourcesChip } from './components/sources'

/**
 * One turn.
 *
 *   Message                          — the row; user reverses it
 *     div gap-3
 *       ActionTimeline               — assistant only, one pill *before* the answer
 *       MessageContent               — paragraphs and cards, in the model's order
 *       sources chip                 — closed by default
 *
 * The model chose which cards belong in the answer and placed each beside the
 * paragraph it belongs to; the server kept that order. Rendering the parts in
 * this one column keeps it, instead of moving every card above or below all of
 * the prose.
 *
 * A user message is a bubble; an assistant message is not: the answer is the
 * page, and wrapping it in a tinted box makes it look like a quote from
 * somewhere else.
 */

/**
 * Turn the model's raw source IDs into the numbers next to the sources below.
 *
 * The model cites by ID because that is what the server can verify; `[x_1901]`
 * is not something to show a reader. A matched marker becomes a `#cite-n` link,
 * which `MarkdownContent` draws as a numbered pill. A marker with no matching
 * source is left alone rather than renumbered — it means the server dropped
 * that citation, and quietly tidying it away would hide exactly that.
 */
const withCitationMarkers = (text: string, sources: Citation[]): string => {
  if (!sources.length) return text
  const index = new Map(sources.map((source, position) => [source.source_id, position + 1]))
  return text.replace(/\[([a-z]+_[A-Za-z0-9]+)\]/g, (marker, id: string) => {
    const position = index.get(id)
    return position ? `[${position}](#cite-${position})` : marker
  })
}

/** The break before a new turn, on top of the gap every sibling already has. */
const TURN_GAP = 'mt-3 first:mt-0'

export const MessageBubble = ({
  message,
  runEvents = [],
}: {
  message: AgentMessage
  runEvents?: readonly ActivityEvent[]
}) => {
  const parts = message.parts ?? []
  const hasTextPart = parts.some((part) => part.kind === 'text')
  const sources = message.sources ?? []

  if (message.role === 'user') {
    return (
      <Message className={TURN_GAP} from="user">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <MessageContent>
            <Bubble>
              <MessageBubbleContent className="whitespace-pre-wrap rounded-br-[4px] [overflow-wrap:anywhere]">
                {message.text}
              </MessageBubbleContent>
            </Bubble>
          </MessageContent>
        </div>
      </Message>
    )
  }

  const activity = parts.find((part) => part.kind === 'activity')
  const body = parts.filter((part) => part.kind !== 'activity')

  return (
    <Message from="assistant">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {activity?.kind === 'activity' && (
          <ActionTimeline
            messageId={activity.activity.runId}
            events={toActivityEvents(activity.activity.steps)}
            status={toRunStatus(
              activity.activity.runId,
              activity.activity.status,
              activity.activity.steps,
              runEvents
            )}
          />
        )}
        {!activity && message.status === 'pending' && (
          <AgentRunStatusRow status={toRunStatus(message.id, 'running', [], runEvents)} />
        )}

        <MessageContent className="gap-3">
          {body.map((part) => {
            switch (part.kind) {
              case 'text':
                return (
                  <MarkdownContent
                    key={part.id}
                    className="text-foreground/85"
                    content={withCitationMarkers(part.text, sources)}
                  />
                )
              case 'card':
                return <ResearchCardRenderer key={part.id} card={part.card} />
              case 'visualization':
                return <FlowRenderer key={part.id} spec={part.spec} />
              case 'unsupported':
                return part.type === 'data-visualization' || part.type === 'data-research-card' ? (
                  <UnavailableSlot key={part.id} label="A result could not be shown" />
                ) : null
              default:
                return null
            }
          })}

          {message.text &&
            !hasTextPart &&
            // An error is a sentence this client wrote, not prose from a model,
            // so it is not run through a markdown parser.
            (message.status === 'error' ? (
              <div className="border-destructive/20 bg-destructive/[0.07] flex flex-col gap-1 rounded-xl border px-3.5 py-3">
                <span className="text-13 font-semibold leading-[18px]">Something went wrong</span>
                <p className="text-13 text-foreground/80 whitespace-pre-wrap leading-[18px]">
                  {message.text}
                </p>
              </div>
            ) : (
              <MarkdownContent
                className="text-foreground/85"
                content={withCitationMarkers(message.text, sources)}
              />
            ))}
        </MessageContent>

        {sources.length > 0 && <SourcesChip sources={sources} parts={parts} />}
      </div>
    </Message>
  )
}

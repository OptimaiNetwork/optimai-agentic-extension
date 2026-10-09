import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'

import type { AgentActivityEvent, AgentRunStatus } from './view-contract'

import { AgentDisclosure } from './agent-disclosure'
import { ThinkingShimmer } from './thinking-shimmer'
import { cn } from '@extension/ui'

import { summarizeAgentActivity, type ActivitySummary } from './activity-summary'

type TimelineState = ActivitySummary['state'] | 'failed'

type ActionTimelineProps = {
  /** Executor events belonging to the assistant message this rail explains. */
  events?: readonly AgentActivityEvent[]
  /** The client-owned run status. It is filtered to `messageId` below. */
  status?: AgentRunStatus
  /** Stable message id used to bind the run status and accessibility ids. */
  messageId?: string
}

/**
 * The compact, collapsible work rail shown above an answer.
 *
 * The original component consumed persisted actions and server turns. Those
 * records no longer exist in the client-owned loop, so this version keeps the
 * same interaction and visual language while consuming the current
 * AgentActivityEvent stream and AgentRunStatus lifecycle.
 */
export function ActionTimeline({
  events = [],
  status,
  messageId,
}: ActionTimelineProps): React.JSX.Element | null {
  const disclosureId = `agent-timeline-${useId().replaceAll(':', '')}`
  const [choice, setChoice] = useState<{ active: boolean; open: boolean } | null>(null)

  const runStatus = status && (!messageId || status.messageId === messageId) ? status : undefined
  const summaries = summarizeAgentActivity(events)
  const hasEventWork = summaries.some(({ summary }) => summary.state === 'running')
  const running = runStatus ? !['done', 'failed'].includes(runStatus.phase) : hasEventWork
  const failed = runStatus?.phase === 'failed'
  const terminalState = runStatus?.phase === 'done' ? 'done' : undefined
  const waitingForUser = runStatus?.phase === 'awaiting-approval'
  const hasContent = events.length > 0 || Boolean(runStatus)

  if (!hasContent) return null

  const expanded = choice?.active === running ? choice.open : running
  const elapsed = formatElapsed(events, running)
  const currentSummary = [...summaries].reverse().find(({ summary }) => summary.state === 'running')
    ?.summary.title

  return (
    <div
      className="flex min-w-0 flex-col pl-1"
      data-agent-activity
      data-agent-timeline
      data-agent-timeline-message-id={messageId}
      data-agent-timeline-turn-id={messageId}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={disclosureId}
        data-agent-timeline-toggle
        onClick={() => setChoice({ active: running, open: !expanded })}
        className={cn(
          'text-faint flex items-center gap-1.5 self-start rounded-md py-1 text-sm',
          'hover:text-foreground outline-none transition-colors',
          'focus-visible:ring-ring focus-visible:ring-2'
        )}>
        {running
          ? waitingForUser
            ? 'Waiting for you'
            : 'Working'
          : failed
            ? `Failed after ${elapsed}`
            : `Worked for ${elapsed}`}
        <ChevronDown
          aria-hidden
          className={cn('size-3.5 transition-transform duration-150', expanded && 'rotate-180')}
        />
      </button>

      <div className="sr-only" role="status" aria-live="polite">
        {waitingForUser
          ? 'Waiting for your decision'
          : (currentSummary ?? (running ? 'Working' : failed ? 'Failed' : 'Worked'))}
      </div>

      <AgentDisclosure id={disclosureId} open={expanded} aria-live="off">
        <div className="flex flex-col pt-2" role="list" aria-label="Agent activity">
          {summaries.map(({ id, summary }, index) => (
            <TimelineStep
              key={id}
              id={id}
              summary={summary}
              terminalState={terminalState}
              // A live-stream design marks `failed && index === summaries.length - 1`. A live
              // stream dies on its last event, so the last row is the
              // failure. A snapshot can carry a failed step anywhere, and
              // the step itself says which.
              failed={summary.failed ?? (failed && index === summaries.length - 1)}
              last={index === summaries.length - 1}
            />
          ))}
        </div>
      </AgentDisclosure>
    </div>
  )
}

function TimelineStep({
  id,
  summary,
  terminalState,
  failed,
  last,
}: {
  id: string
  summary: ActivitySummary
  terminalState?: 'done'
  failed: boolean
  last: boolean
}): React.JSX.Element {
  const state: TimelineState = failed
    ? 'failed'
    : summary.state === 'running' && terminalState
      ? terminalState
      : summary.state

  return (
    <div
      className="flex items-stretch gap-3"
      role="listitem"
      data-agent-activity-id={id}
      data-agent-activity-state={state}>
      <div className="flex w-4 shrink-0 flex-col items-center pt-0.5">
        <span
          aria-hidden
          data-agent-timeline-dot
          className={cn(
            'z-1 size-2.5 shrink-0 rounded-full',
            state === 'running' && 'bg-brand ring-brand/20 animate-pulse ring-4',
            state === 'done' && 'bg-brand',
            state === 'failed' && 'bg-destructive'
          )}
        />
        {last ? null : <span aria-hidden className="border-border-soft mt-1 w-0 flex-1 border-l" />}
      </div>

      <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-4')}>
        <h3 className="text-sm font-medium leading-5">
          {state === 'running' ? <ThinkingShimmer>{summary.title}</ThinkingShimmer> : summary.title}
        </h3>
        {summary.resultsLabel ? (
          <p className="text-faint mt-1 text-sm leading-snug">{summary.resultsLabel}</p>
        ) : null}
      </div>
    </div>
  )
}

function formatElapsed(events: readonly AgentActivityEvent[], running: boolean): string {
  const timestamps = events
    .map((event) => Date.parse(event.at))
    .filter((value) => Number.isFinite(value))

  if (timestamps.length === 0) return 'a moment'

  const started = Math.min(...timestamps)
  const ended = running ? Date.now() : Math.max(...timestamps)
  const seconds = Math.max(0, Math.round((ended - started) / 1_000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`
}

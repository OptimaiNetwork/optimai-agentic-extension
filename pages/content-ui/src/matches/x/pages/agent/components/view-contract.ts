import type { ActivityStep, ResearchPostSnapshot } from '@extension/shared'
import type { ActivityEvent } from '@x/services/agent'

import { stepLabel, stepResult } from './activity-summary'

/**
 * The shapes the chat components in this directory expect, and how ours become
 * them.
 *
 * The components were written against a live-stream contract (events per tool
 * call, post summaries) that does not exist here, so rather than editing their
 * bodies to speak our types, our types are adapted into theirs at the call
 * site.
 *
 * The two contracts are close because both describe a post read off X. Where
 * they differ, the difference is stated below rather than papered over.
 */

/** `XPostSummary`, the post shape the chat components read. */
export type XPostSummary = {
  id: string
  url: string
  text: string
  author: { name: string; handle: string; avatarUrl?: string; verified?: boolean }
  parentId?: string
  conversationId?: string
  createdAt?: string
  metrics?: {
    replies?: number
    reposts?: number
    likes?: number
    quotes?: number
    views?: number
  }
  quotedPostId?: string
  repostedPostId?: string
  viewerState?: { favorited?: boolean; retweeted?: boolean }
}

/** `null` is how our snapshots say "not read"; `undefined` is how theirs do. */
const absent = <T>(value: T | null | undefined): T | undefined => value ?? undefined

export const toXPostSummary = (post: ResearchPostSnapshot): XPostSummary => ({
  id: post.id,
  url: post.url,
  text: post.text,
  author: {
    name: post.author.name || post.author.handle,
    handle: post.author.handle,
    avatarUrl: absent(post.author.avatarUrl),
    verified: post.author.verified,
  },
  createdAt: absent(post.publishedAt),
  metrics: post.engagement
    ? {
        replies: absent(post.engagement.replies),
        reposts: absent(post.engagement.reposts),
        likes: absent(post.engagement.likes),
        views: absent(post.engagement.views),
      }
    : undefined,
  quotedPostId: absent(post.quotedPostId),
  repostedPostId: absent(post.repostedPostId),
  // Deliberately never set. `viewerState` drives a like and repost
  // buttons; this panel renders a snapshot of a post and cannot act on it, so
  // there is no state of ours for those controls to reflect.
})

/** `ActivitySummary`, the shape a work rail row reads. */
export type ActivityState = 'running' | 'done'

export type ActivitySummary = {
  title: string
  state: ActivityState
  resultsLabel?: string
  /** Set when this particular step failed, not just the run. */
  failed?: boolean
}

/** What the copied `ActionTimeline` iterates over. */
export type SummarizedActivity = { id: string; summary: ActivitySummary }

/* ------------------------------------------------------- activity contract */

/**
 * `AgentActivityEvent` and `AgentRunStatus`, narrowed to what the copied
 * `ActionTimeline` reads.
 *
 * The timeline consumes a live event stream: many events per tool call,
 * latest wins, keyed by `toolCallId:stepKey`. Ours consumes a server snapshot
 * that has already done that collapsing — one `ActivityStep` per tool call,
 * with a status rather than a phase. So the adapter below runs that reduction
 * backwards: one event per step, which the timeline then "collapses" into the
 * same single row.
 *
 * Doing it this way keeps `action-timeline.tsx` byte-identical to the original
 * apart from its imports, which is the point of copying it.
 */
export type ActivityPhase = 'started' | 'progress' | 'checkpoint'

export type AgentActivityEvent = {
  toolCallId: string
  stepKey: string
  code: string
  phase: ActivityPhase
  at: string
  // A live executor puts observation counts here. Ours carries the row's
  // finished wording as well, so `summarizeAgentActivity` keeps the
  // single-argument signature the copied timeline calls it with.
  safeData?: {
    count?: number
    detail?: string
    title?: string
    resultsLabel?: string
    /** This step failed, wherever it sits in the list. */
    failed?: boolean
  }
}

/**
 * `AgentRunStatus`, with the live-stream phases kept whole.
 *
 * Its `AgentRunStatusRow` reads all six, and narrowing them here would have
 * meant editing that file. Ours are derived in `toRunStatus` below: a turn with
 * no step yet is thinking, a turn with a step in flight is working on that
 * tool, and the server's `answering` event means it is writing the answer.
 * Completed tools alone do not imply that answer writing has started.
 */
export type AgentRunStatus = {
  messageId: string
  phase: 'thinking' | 'tool' | 'writing' | 'awaiting-approval' | 'done' | 'failed'
  toolName?: string
}

const PHASE_BY_STATUS: Record<string, ActivityPhase> = {
  running: 'started',
  completed: 'checkpoint',
  failed: 'checkpoint',
  cancelled: 'checkpoint',
  interrupted: 'checkpoint',
}

/**
 * Whether a step is a failure, carried separately from its phase.
 *
 * A live stream has no need for this: its rail paints red on the last row when the
 * whole run failed, which is right for a live stream that dies on its final
 * event. A snapshot can hold a failed step at any position, and marking only
 * the last one put a green dot on the step that actually broke.
 */
const isFailure = (status: string): boolean => status === 'failed'

const TERMINAL: Record<string, AgentRunStatus['phase']> = {
  completed: 'done',
  cancelled: 'done',
  expired: 'done',
  failed: 'failed',
}

/** The earliest start across the steps, for the "Worked for 12s" header. */
export const startedAt = (steps: readonly ActivityStep[]): string | undefined =>
  steps.map((step) => step.startedAt).sort()[0]

const label = (step: ActivityStep): string => stepLabel(step)

const results = (step: ActivityStep): string | undefined => {
  return stepResult(step)
}

export const toActivityEvents = (steps: readonly ActivityStep[]): AgentActivityEvent[] => {
  // One synthetic event carrying the earliest start.
  //
  // The copied `formatElapsed` spans `max - min` of the event timestamps, and
  // in a live stream the first event is a step *starting*. Ours carried each step's
  // finish, so step one's whole duration fell outside the span — and a
  // single-step run measured `started === ended` and read "Worked for 0s".
  const opening: AgentActivityEvent[] = steps.length
    ? [
        {
          toolCallId: '__start__',
          stepKey: '__start__',
          code: steps[0].code,
          phase: 'checkpoint',
          at: startedAt(steps) ?? steps[0].startedAt,
        },
      ]
    : []

  return [
    ...opening,
    ...steps.map((step) => ({
      toolCallId: step.toolCallId ?? step.id,
      stepKey: step.code,
      code: step.code,
      phase: PHASE_BY_STATUS[step.status] ?? ('started' as const),
      at: step.finishedAt ?? step.startedAt,
      safeData: {
        count: step.count ?? undefined,
        detail: step.detail ?? undefined,
        title: label(step),
        resultsLabel: results(step),
        failed: isFailure(step.status),
      },
    })),
  ]
}

export const toRunStatus = (
  messageId: string,
  status: string,
  steps: readonly ActivityStep[],
  activityEvents: readonly ActivityEvent[] = []
): AgentRunStatus => {
  const terminal = TERMINAL[status]
  if (terminal) {
    // A run the server calls completed while a step failed is not a clean
    // finish, and the rail should not say it was.
    return {
      messageId,
      phase:
        terminal === 'done' && steps.some((step) => step.status === 'failed') ? 'failed' : terminal,
    }
  }

  const latestEvent = activityEvents[activityEvents.length - 1]
  if (latestEvent?.kind === 'answering') return { messageId, phase: 'writing' }

  const inFlight = steps.find((step) => step.status === 'running')
  if (inFlight) return { messageId, phase: 'tool', toolName: inFlight.code }
  if (latestEvent?.kind === 'tool_started') {
    return { messageId, phase: 'tool', toolName: latestEvent.tool ?? undefined }
  }

  // A finished tool is followed by another model pass; that is still thinking
  // until the server reports that the final answer is being composed.
  return { messageId, phase: 'thinking' }
}

import type { ActivityEvent } from '@x/services/agent'
import { Spinner } from '@extension/ui'

/**
 * What the agent is doing, from what it actually did.
 *
 * Every line here corresponds to a tool the model really called, reported by the
 * backend. It is not the model's reasoning — that is neither ours to show nor
 * reliable as an account of events — and there is no invented "analysing…" step
 * to fill the wait.
 */
const LABELS: Record<ActivityEvent['kind'], string> = {
  thinking: 'Deciding what to look up',
  tool_started: 'Searching X',
  tool_finished: 'Read the results',
  tool_failed: 'A step did not complete',
  answering: 'Writing the answer',
}

export const ActivityTrail = ({ events }: { events: ActivityEvent[] }) => {
  if (!events.length) return null
  const recent = events.slice(-4)
  const latest = recent[recent.length - 1]

  return (
    <div className="rounded-10 space-y-1 bg-white/[0.04] p-2.5">
      {recent.map((event) => (
        <div
          key={event.seq}
          className={`text-11 flex items-center gap-2 ${
            event === latest ? 'text-foreground/85' : 'text-muted-foreground'
          }`}>
          {event === latest ? (
            <Spinner className="text-primary size-3" />
          ) : (
            <span className="bg-muted-foreground/40 size-1.5 rounded-full" />
          )}
          <span className="truncate">
            {LABELS[event.kind]}
            {event.detail ? ` · ${event.detail}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

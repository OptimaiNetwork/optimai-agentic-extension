import type { AgentRunStatus } from './view-contract'

import { ThinkingShimmer } from './thinking-shimmer'

import { toolTitles } from './activity-summary'

const labels: Record<AgentRunStatus['phase'], string> = {
  thinking: 'Thinking',
  tool: 'Working on X',
  'awaiting-approval': 'Waiting for your approval',
  writing: 'Writing the answer',
  // A run that has stopped says nothing: the message it wrote is the report.
  done: '',
  failed: '',
}

/**
 * Where a client-owned turn has got to. Nothing at all once it has stopped, and
 * nothing when the conversation has never had one.
 */
export function AgentRunStatusRow({
  status,
}: {
  status?: AgentRunStatus
}): React.JSX.Element | null {
  if (!status || status.phase === 'done' || status.phase === 'failed') return null
  const label = labels[status.phase]
  // `toolName` is a stored name, so the clarification pause reads here too.
  const tool = status.toolName ? toolTitles[status.toolName] : undefined

  return (
    <div
      role="status"
      aria-live="polite"
      data-agent-run-phase={status.phase}
      className="flex min-w-0 items-center pl-1 text-sm">
      <ThinkingShimmer>{tool ? `${label} · ${tool}` : label}</ThinkingShimmer>
    </div>
  )
}

import type { ReactNode } from 'react'

import { cn } from '@extension/ui'

/**
 * The shared frame every artifact card uses. Semantic tokens only.
 *
 * No kind header. The card's own content says what it is — a post looks like a
 * post, a profile looks like a profile — and a label bar over every one of them
 * was a caption on a photograph of a caption.
 *
 * Held to 80% of the column and aligned left, so a card reads as something the
 * answer produced rather than as another full-width block of the transcript.
 * Approval cards keep the full width: those are a decision the reader has to
 * make, not a result they are being shown.
 */
export function ArtifactShell({
  label,
  tone = 'neutral',
  children,
  className,
}: {
  label: string
  tone?: 'neutral' | 'brand' | 'warning'
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <article
      aria-label={label}
      data-slot="artifact"
      data-tone={tone}
      className={cn(
        'border-border-soft bg-surface text-card-foreground mt-2 w-full max-w-[80%] overflow-hidden rounded-2xl border',
        'animate-artifact-rise hover:border-border-strong transition-colors duration-200 motion-reduce:animate-none',
        tone === 'brand' && 'border-brand/30 hover:border-brand/50',
        tone === 'warning' && 'border-warning/30 hover:border-warning/50',
        className
      )}>
      {children}
    </article>
  )
}

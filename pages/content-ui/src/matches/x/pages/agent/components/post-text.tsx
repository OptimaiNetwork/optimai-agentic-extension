import { useState } from 'react'

import { cn } from '@extension/ui'

import { EntityText } from './entity-text'

/**
 * Shorter than a post's own 280, on purpose. A card is a reference to a post,
 * not a place to read one — five lines of body text pushed the metrics, and
 * whatever the card was actually reporting, off the bottom of the column.
 * `Show more` is right there for anyone who wants the rest.
 */
const DEFAULT_MAX_LENGTH = 180

/**
 * Post body text:
 * entities painted by `EntityText`, plus a Show more control once the text
 * runs past a post's own length limit.
 */
export function PostText({
  text,
  className,
  maxLength = DEFAULT_MAX_LENGTH,
}: {
  text: string
  className?: string
  maxLength?: number
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const shouldTruncate = text.length > maxLength
  const shown = shouldTruncate && !expanded ? `${text.slice(0, maxLength).trimEnd()}...` : text

  return (
    <div className={cn('text-15 text-foreground', className)}>
      <p className="whitespace-pre-wrap break-words">
        <EntityText text={shown} />
      </p>
      {shouldTruncate ? (
        <button
          type="button"
          className="text-brand mt-1 text-sm transition-colors hover:underline"
          onClick={(event) => {
            event.stopPropagation()
            setExpanded((value) => !value)
          }}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}

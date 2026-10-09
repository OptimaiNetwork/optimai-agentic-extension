import { Fragment, type ReactNode } from 'react'

import { entityRegex, isEntity, trimEntity } from './post-entities'

/**
 * Text with X's inline entities painted in its link blue: `@mentions`,
 * `#hashtags` and URLs. Extracted from `PostText` so a bio gets the same
 * treatment a post body does — a bio is the same kind of text, written in the
 * same composer, and an `@` in it reading as plain grey is the tell that a card
 * is rendering a string rather than showing a profile.
 *
 * Coloured, never linked. A card must not become a second way to navigate off
 * to somewhere the agent never went; the one control on each card goes to the
 * subject itself and that is the whole navigation surface this feature adds.
 *
 * Renders inline with no wrapper, so the caller owns size, colour and clamping.
 */
export function EntityText({ text }: { text: string }): React.JSX.Element {
  return <>{highlightEntities(text)}</>
}

function highlightEntities(text: string): ReactNode[] {
  return text.split(entityRegex()).map((chunk, index) => {
    if (!(chunk && isEntity(chunk))) return <Fragment key={index}>{chunk}</Fragment>
    // Keep trailing punctuation outside the coloured span.
    const { text: entity, trimmed } = trimEntity(chunk)
    return (
      <Fragment key={index}>
        <span className="text-x-reply">{entity}</span>
        {trimmed > 0 ? chunk.slice(entity.length) : null}
      </Fragment>
    )
  })
}

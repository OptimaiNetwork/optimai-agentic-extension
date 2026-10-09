import {
  TEXT_SHIMMER_CLASS_NAME,
  TEXT_SHIMMER_KEYFRAMES,
  textShimmerStyle,
} from './text-shimmer-style'
import { cn } from '@extension/ui'
import type { ElementType, ReactNode } from 'react'

export interface TextShimmerProps {
  children: ReactNode
  as?: ElementType
  duration?: number
  className?: string
}

function TextShimmer({
  children,
  as: Comp = 'span',
  duration = 2.5,
  className,
}: TextShimmerProps): React.JSX.Element {
  return (
    <>
      <style>{TEXT_SHIMMER_KEYFRAMES}</style>
      <Comp
        style={textShimmerStyle(duration)}
        className={cn('inline-block', TEXT_SHIMMER_CLASS_NAME, className)}>
        {children}
      </Comp>
    </>
  )
}

export { TextShimmer }

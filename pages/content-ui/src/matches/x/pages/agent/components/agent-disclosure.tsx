import { motion, type HTMLMotionProps, useReducedMotion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { cn } from '@extension/ui'

/**
 * A shared easing curve, inlined.
 *
 * A design system may ship a module of a dozen curves. One curve is used here, and importing a module to get it would be
 * carrying a design system in to borrow a number.
 */
const EASE_OUT = [0.16, 1, 0.3, 1] as const

export interface AgentDisclosureProps extends Omit<HTMLMotionProps<'div'>, 'animate' | 'initial'> {
  open: boolean
  openHeight?: CSSProperties['height']
}

/** Shared transform-only reveal for collapsible agent content. */
export function AgentDisclosure({
  open,
  openHeight = 'auto',
  className,
  style,
  transition,
  ...props
}: AgentDisclosureProps) {
  const reduce = useReducedMotion() ?? false

  return (
    <motion.div
      {...props}
      aria-hidden={!open}
      inert={!open}
      initial={false}
      animate={
        reduce
          ? { opacity: open ? 1 : 0 }
          : {
              opacity: open ? 1 : 0,
              clipPath: open ? 'inset(-8px)' : 'inset(0 0 100% 0)',
              y: open ? 0 : -4,
            }
      }
      transition={
        transition ?? {
          duration: reduce ? 0 : open ? 0.22 : 0.14,
          ease: EASE_OUT,
        }
      }
      className={cn(open ? 'overflow-visible' : 'overflow-hidden', className)}
      style={{
        ...style,
        height: open ? openHeight : 0,
        pointerEvents: open ? undefined : 'none',
        transformOrigin: 'top',
      }}
    />
  )
}

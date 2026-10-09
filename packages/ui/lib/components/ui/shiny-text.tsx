import { cn } from '../../utils'
import { useAnimate } from 'framer-motion'
import { HTMLAttributes, useEffect, useRef } from 'react'

interface ShinyTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  className?: string
  duration?: number // Duration in seconds
  onComplete?: () => void
  paused?: boolean
  repeat?: number // Number of times to repeat, Infinity for infinite
}

export function ShinyText({
  children,
  className,
  duration = 3,
  onComplete,
  paused = false,
  repeat = 10000,
  ...props
}: ShinyTextProps) {
  const [scope, animate] = useAnimate()
  const countRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    const loop = async () => {
      while (!cancelled && countRef.current < repeat) {
        await animate(
          scope.current,
          {
            backgroundPosition: ['100%', '-100%'],
          },
          {
            duration,
            ease: 'linear',
          }
        )

        countRef.current += 1

        if (countRef.current === 1) {
          onComplete?.()
        }
      }
    }

    loop()

    return () => {
      cancelled = true
    }
  }, [animate, duration])

  return (
    <span
      ref={scope}
      className={cn('relative block w-fit bg-clip-text text-white/40', className)}
      style={{
        backgroundImage:
          'linear-gradient(120deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0) 60%)',
        backgroundSize: '200% 100%',
      }}
      {...props}>
      {children}
    </span>
  )
}

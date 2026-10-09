import { cn } from '../../utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border-transparent bg-white/10 text-white/70 hover:bg-white/20',
        destructive: 'border-transparent bg-destructive text-white hover:bg-destructive/90',
        outline: 'border-white/20 text-white/60 bg-transparent hover:bg-white/10 hover:text-white',
        'primary-soft': 'bg-primary/20 text-primary border-primary/30',
        'white-soft': 'bg-white/10 text-white/70 border-white/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  }
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }

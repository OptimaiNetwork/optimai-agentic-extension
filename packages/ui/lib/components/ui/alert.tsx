import { cn } from '../../utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Icon, IconProps } from './icon'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 grid grid-cols-1 [&:has(>svg)]:grid-cols-[auto_minmax(0,1fr)] gap-3',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
))
Alert.displayName = 'Alert'

const AlertIcon = ({ className, ...props }: IconProps) => {
  return <Icon className={cn('size-6', className)} {...props} />
}

const AlertContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn('w-full space-y-1', className)} {...props} />
}

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('text-16 xl:text-18 font-normal leading-tight', className)}
      {...props}
    />
  )
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-14 [&_p]:leading-normal', className)} {...props} />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle }

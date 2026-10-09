import { cn } from '../../../utils'
import React from 'react'

export type IconButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  isSubmitting?: boolean
}

const IconButton = ({ className, children, ...props }: IconButtonProps) => {
  return (
    <button
      className={cn(
        'border-foreground/10 bg-accent/50 backdrop-blur-40 hover:border-foreground/20 hover:bg-accent flex size-9 items-center justify-center rounded-full border transition-colors',
        className
      )}
      {...props}>
      {children}
    </button>
  )
}

export { IconButton }

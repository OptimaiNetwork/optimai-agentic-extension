import { cn } from '../../utils'
import * as React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-light text-white outline-none transition-colors',
          'placeholder:text-white/40',
          'focus:border-primary/40',
          'invalid:border-destructive/50 invalid:bg-destructive/10',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }

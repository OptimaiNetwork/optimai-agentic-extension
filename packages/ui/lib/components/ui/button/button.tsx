import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../../../utils'

const buttonVariants = cva(
  'inline-flex items-center text-16 justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all select-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-black hover:bg-primary/90 text-primary-foreground',
        secondary: 'border border-white/20 bg-white/10 text-white hover:bg-white/20',
        outline: 'bg-transparent text-primary border border-primary/30 hover:bg-primary/10',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        ghost: 'bg-transparent text-white/70 hover:bg-white/5 hover:text-white',
        link: 'text-primary underline-offset-4 hover:underline',
        opacity: 'transition-opacity hover:opacity-60',
      },
      size: {
        sm: 'px-3 py-1.5 text-[12px]',
        default: 'px-4 py-2 text-13',
        lg: 'px-6 py-3 text-[16px]',
      },
      icon: {
        true: 'p-0',
        false: null,
      },
    },
    compoundVariants: [
      {
        size: 'sm',
        icon: true,
        class: 'size-8',
      },
      {
        size: 'default',
        icon: true,
        class: 'size-9',
      },
      {
        size: 'lg',
        icon: true,
        class: 'size-11',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      icon: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, icon, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, icon, className }))}
        ref={ref}
        type="button"
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

'use client'

import { cn } from '../../utils'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { useAppContainer, useShadowRoot } from '../../providers/shadow-root'

const Select = SelectPrimitive.Root

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { icon?: boolean }
>(({ className, children, icon = true, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'border-primary/10 focus:border-primary/30 flex h-9 w-full items-center justify-between rounded-lg border bg-transparent px-3 py-2 text-sm text-white/70 transition-all hover:bg-white/5 hover:text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}>
    {children}
    {icon && (
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 text-white/60" />
      </SelectPrimitive.Icon>
    )}
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectValue = SelectPrimitive.Value

const SelectContent = ({
  className,
  children,
  position = 'popper',
  inModal = false,
  ...props
}: React.ComponentPropsWithRef<typeof SelectPrimitive.Content> & { inModal?: boolean }) => {
  const appContainer = useAppContainer()
  const { shadowRootContainer } = useShadowRoot()

  return (
    <SelectPrimitive.Portal container={(inModal ? shadowRootContainer : appContainer) ?? undefined}>
      <SelectPrimitive.Content
        onCloseAutoFocus={(e) => e.preventDefault()}
        className={cn(
          'border-primary/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 bg-background/90 relative z-50 max-h-96 w-full min-w-[8rem] gap-1 overflow-hidden rounded-lg border text-white shadow-lg backdrop-blur-md',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        {...props}>
        <SelectPrimitive.Viewport
          className={cn(
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] space-y-1'
          )}>
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

const SelectItem = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    className={cn(
      'data-[state=checked]:bg-primary/30 data-[state=checked]:text-primary relative flex w-full cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 outline-none transition-all hover:bg-white/5 hover:text-white focus:bg-white/10 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}>
    {children}
  </SelectPrimitive.Item>
)

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }

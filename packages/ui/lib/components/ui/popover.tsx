import { cn } from '../../utils'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as React from 'react'

import { useAppContainer, useShadowRoot } from '../../providers/shadow-root'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverClose = PopoverPrimitive.Close

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { inModal?: boolean }
>(({ className, align = 'center', sideOffset = 4, inModal = false, ...props }, ref) => {
  const appContainer = useAppContainer()
  const { shadowRootContainer } = useShadowRoot()

  return (
    <PopoverPrimitive.Portal
      container={(inModal ? shadowRootContainer : appContainer) ?? undefined}>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        onCloseAutoFocus={(e: Event) => e.preventDefault()}
        className={cn(
          'border-white/8 z-50 w-72 rounded-xl border bg-[#272728] shadow-2xl shadow-black/50 outline-none backdrop-blur-xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverClose, PopoverContent, PopoverTrigger }

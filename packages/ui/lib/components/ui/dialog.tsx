import { cn } from '../../utils'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'

import { useShadowRoot } from '../../providers/shadow-root'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogClose = DialogPrimitive.Close

const DialogPortal = ({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) => {
  const { shadowRootContainer } = useShadowRoot()

  return (
    <DialogPrimitive.Portal container={shadowRootContainer ?? undefined} {...props}>
      {children}
    </DialogPrimitive.Portal>
  )
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'border-white/8 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed left-1/2 top-1/2 z-[9999] grid max-h-[98svh] w-[95vw] max-w-[600px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-[#272728] p-0 shadow-lg backdrop-blur-xl duration-200',
        className
      )}
      onOpenAutoFocus={(e) => e.preventDefault()}
      onCloseAutoFocus={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => e.preventDefault()}
      {...props}>
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
const DialogHeader = ({ className, ...props }: DialogHeaderProps) => {
  return (
    <div
      className={cn(
        'border-white/8 flex items-center justify-between border-b px-6 py-4',
        className
      )}
      {...props}
    />
  )
}
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-white', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      'text-14 text-foreground/80 xl:text-16 text-center leading-relaxed tracking-tight',
      className
    )}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

interface DialogCloseButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  onClose?: () => void
}

const DialogCloseButton = React.forwardRef<HTMLButtonElement, DialogCloseButtonProps>(
  ({ className, onClose, ...props }, ref) => (
    <button
      ref={ref}
      onClick={onClose}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white',
        className
      )}
      {...props}>
      <X className="h-4 w-4" />
    </button>
  )
)
DialogCloseButton.displayName = 'DialogCloseButton'

interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {}
const DialogBody = ({ className, ...props }: DialogBodyProps) => {
  return <div className={cn('p-6', className)} {...props} />
}
DialogBody.displayName = 'DialogBody'

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

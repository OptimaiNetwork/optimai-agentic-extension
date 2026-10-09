import { cn } from '../../utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { ExternalToast, toast } from 'sonner'
import { Icon } from './icon'

const alertVariants = cva(
  'w-[var(--width,100%)] mx-auto mt-4 [will-change:backdrop-filter] cursor-pointer grid grid-cols-[auto_minmax(0,1fr)_auto] rounded-lg p-3 xl:px-4 gap-3 items-center text-white backdrop-blur-md',
  {
    variants: {
      variant: {
        success: 'bg-primary/20 border border-primary/20',
        error: 'bg-destructive/20 border border-destructive/20',
      },
    },
  }
)

type ToastProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    toastId?: string | number
    message: string
  }

const duration = 5000

const Toast = ({ className, variant, toastId, message, ...props }: ToastProps) => {
  const [countdown, setCountdown] = useState(duration / 1000)

  const shouldClose = countdown <= 0

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (shouldClose) {
      toast.dismiss(toastId)
    }
  }, [shouldClose, toastId])

  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      onClick={() => toast.dismiss(toastId)}
      {...props}>
      <Icon className="size-4.5 xl:size-6" icon={variant === 'success' ? 'Check' : 'X'} />
      <p className="text-16 w-full font-normal leading-normal">{message}</p>
      <p className="text-16 leading-normal opacity-50">
        close in <span className="tabular-nums">{countdown}</span>s
      </p>
    </div>
  )
}

const toastSuccess = (message: string, data?: ExternalToast) => {
  toast.dismiss()
  return toast.custom((id) => {
    return <Toast toastId={id} variant="success" message={message} />
  }, data)
}

const toastError = (message: string, data?: ExternalToast) => {
  toast.dismiss()
  return toast.custom((id) => {
    return <Toast toastId={id} variant="error" message={message} />
  }, data)
}

export { Toast, toastError, toastSuccess }

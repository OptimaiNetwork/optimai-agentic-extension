import { Spinner } from '../spinner'
import { cn } from '../../../utils'
import cx from 'clsx'
import React, { ReactNode } from 'react'
import { Button } from './button'

type SubmitButtonProps = React.ComponentPropsWithoutRef<typeof Button> & {
  loading?: boolean
  startIcon?: ReactNode
}

const SubmitButton = ({
  className,
  loading,
  startIcon,
  children,
  disabled,
  ...props
}: SubmitButtonProps) => {
  return (
    <Button
      className={cx('relative', { loading: loading }, className)}
      disabled={loading || disabled}
      type="submit"
      {...props}>
      {startIcon ? (
        <>
          <div className="relative">
            <span className={cn('block', loading && 'opacity-0')}>{startIcon}</span>
            {loading && (
              <Spinner className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2" />
            )}
          </div>
          {children}
        </>
      ) : (
        <>
          <span className={cn('block transition-opacity', loading && 'opacity-0')}>{children}</span>
          {loading && (
            <Spinner className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2" />
          )}
        </>
      )}
    </Button>
  )
}

export { SubmitButton }

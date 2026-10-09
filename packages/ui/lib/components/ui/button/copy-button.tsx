import { cn } from '../../../utils'
import { ComponentPropsWithoutRef, useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'

import { Icon } from '../icon'
import { Button } from './button'

interface CopyButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  textToCopy: string
  iconSize?: number
  iconClassName?: string
}

const CopyButton = ({
  className,
  textToCopy,
  onClick,
  iconClassName,
  iconSize,
  ...props
}: CopyButtonProps) => {
  const [showTooltip, setShowTooltip] = useState(false)

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    navigator.clipboard.writeText(textToCopy)
    setShowTooltip(true)
    onClick?.(e)
  }

  useEffect(() => {
    if (showTooltip) {
      const timeout = setTimeout(() => {
        setShowTooltip(false)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [showTooltip])

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "data-[state='copied']:text-positive transition-opacity hover:opacity-60 data-[state='copied']:!opacity-100",
              className
            )}
            onClick={handleCopy}
            disabled={showTooltip}
            data-state={showTooltip ? 'copied' : ''}
            {...props}>
            <Icon className={iconClassName} icon={showTooltip ? 'Check' : 'Copy'} size={iconSize} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copied!</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { CopyButton }

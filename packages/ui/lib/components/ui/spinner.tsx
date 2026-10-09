import { cn } from '../../utils'
import { LucideProps } from 'lucide-react'
import { Icon } from './icon'

interface SpinnerProps extends Omit<LucideProps, 'name'> {}

const Spinner = ({ className, ...props }: SpinnerProps) => {
  return (
    <span className={cn('block', className)}>
      <Icon icon="LoaderCircle" className={cn('animate-spin text-current')} {...props} />
    </span>
  )
}

export { Spinner }

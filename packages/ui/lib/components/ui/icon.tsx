import { SvgIcons } from '../../assets/svgs'
import { cn } from '../../utils'
import { icons, LucideProps } from 'lucide-react'

export type LucideIconName = keyof typeof icons

type IconProps = LucideProps & {
  icon: LucideIconName
}

export type SvgIconName = keyof typeof SvgIcons

type SvgIconProps = {
  icon: SvgIconName | object
  size?: number | string
} & React.SVGProps<SVGSVGElement>

const SvgIcon = (props: SvgIconProps) => {
  const { icon, size = 24, className, ...data } = props
  if (icon) {
    if (typeof icon === 'string') {
      const Icon = SvgIcons[icon]
      return <Icon className={cn('leading-none', className)} fontSize={size} {...data} />
    }
    const Icon = icon as any
    return <Icon className={cn('leading-none', className)} fontSize={size} {...data} />
  }

  return null
}

const Icon = ({ icon: name, color = 'currentColor', size = 24, ...props }: IconProps) => {
  const LucideIcon = icons[name]

  return <LucideIcon strokeWidth={1.5} color={color} size={size} {...props} />
}

export { Icon, SvgIcon, type LucideIconName as IconName, type IconProps }

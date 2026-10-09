import { IMAGES } from '../../assets/images'
import { cn } from '../../utils'
import { ImgHTMLAttributes } from 'react'

interface LogoProps extends ImgHTMLAttributes<HTMLImageElement> {
  variant?: 'full' | 'text' | 'icon'
}

const Logo = ({ className, variant = 'full', ...props }: LogoProps) => {
  const logoSrc = {
    full: IMAGES.LOGO,
    text: IMAGES.TEXT_LOGO,
    icon: IMAGES.ICON,
  }

  return (
    <img
      className={cn('max-h-none w-auto max-w-none', className)}
      src={logoSrc[variant]}
      alt="OptimAI Agentic"
      {...props}
    />
  )
}

export { Logo }

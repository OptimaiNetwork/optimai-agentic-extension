import { ChainBadge } from '@x/pages/home/token-logo'
import type { PortfolioChain } from '@x/services/catalyst'
import { useState } from 'react'

const SIZES = {
  // Home's proportions for a 20px logo; an 11px badge hid half of it.
  sm: { box: 'size-5', text: 'text-[8px]', badge: 'size-[9px]', mark: 'size-[6px]' },
  md: { box: 'size-8', text: 'text-10', badge: 'size-[14px]', mark: 'size-[10px]' },
} as const

/**
 * A token's logo with its chain in the corner, the way the Home list draws it.
 *
 * The portfolio mixes chains, and NVDA on BNB Chain and NVDA on Solana are two
 * positions with the same logo: the badge is what tells them apart.
 */
export const TokenIcon = ({
  ticker,
  chain,
  logo,
  size = 'md',
  badge = true,
}: {
  ticker: string
  chain: PortfolioChain
  logo?: string | null
  size?: keyof typeof SIZES
  /** Off where the chain has a column of its own and the corner would say it twice. */
  badge?: boolean
}) => {
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const s = SIZES[size]
  const showLogo = Boolean(logo) && failedLogo !== logo
  const icon = showLogo ? (
    <img
      src={logo ?? undefined}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setFailedLogo(logo ?? null)}
      className={`${s.box} shrink-0 rounded-full bg-white/5 object-contain`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${s.box} ${s.text} text-secondary-foreground flex shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold`}>
      {ticker.slice(0, 2)}
    </span>
  )
  if (!badge) return icon
  return (
    <ChainBadge chain={chain} badgeClassName={s.badge} markClassName={s.mark}>
      {icon}
    </ChainBadge>
  )
}

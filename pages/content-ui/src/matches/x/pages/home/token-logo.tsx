import { cn } from '@extension/ui'
import type { ChainId } from '@extension/shared'
import type { StockToken } from '@x/services/catalyst'
import { NamespaceMark } from '@x/modules/wallet/marks'
import { useSelectedChain } from '@x/modules/venue'
import type { ReactNode } from 'react'
import { useState } from 'react'

/** Place the selected chain's mark over a token image or its initials fallback. */
export const ChainBadge = ({
  chain,
  children,
  className,
  badgeClassName = 'size-[14px]',
  markClassName = 'size-[10px]',
}: {
  chain: ChainId
  children: ReactNode
  className?: string
  badgeClassName?: string
  markClassName?: string
}) => (
  <span className={cn('relative inline-flex shrink-0', className)}>
    {children}
    <span
      role="img"
      aria-label={chain === 'solana' ? 'Solana' : 'BNB Chain'}
      className={cn(
        'bg-brown absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-2 ring-[#2b2b2b]',
        badgeClassName
      )}>
      <NamespaceMark namespace={chain === 'solana' ? 'svm' : 'evm'} className={markClassName} />
    </span>
  </span>
)

/**
 * A token logo, with its chain visible on both the resolved image and initials
 * fallback. The token's own chain wins so saved/detail cards keep their identity
 * when the panel's current selection changes.
 */
export const TokenLogo = ({
  token,
  className = '',
  chain,
}: {
  token: StockToken
  className?: string
  chain?: ChainId
}) => {
  const selectedChain = useSelectedChain()
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const activeChain = token.chain ?? chain ?? selectedChain
  const badgeClassName = /\bsize-(?:4|5)\b/.test(className)
    ? 'size-[9px]'
    : /\bsize-6\b/.test(className)
      ? 'size-[11px]'
      : 'size-[12px]'
  const markClassName = badgeClassName === 'size-[9px]' ? 'size-[6px]' : 'size-[8px]'

  const logo =
    token.logo && failedLogo !== token.logo ? (
      <img
        src={token.logo}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={() => setFailedLogo(token.logo)}
        className={`size-7 flex-shrink-0 rounded-full bg-white/5 object-contain ${className}`}
      />
    ) : (
      <span
        aria-hidden="true"
        className={`bg-white/8 text-muted-foreground text-10 flex size-7 flex-shrink-0 items-center justify-center rounded-full font-semibold ${className}`}>
        {token.ticker.slice(0, 2)}
      </span>
    )

  return (
    <ChainBadge chain={activeChain} badgeClassName={badgeClassName} markClassName={markClassName}>
      {logo}
    </ChainBadge>
  )
}

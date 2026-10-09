import { NamespaceMark } from '@x/modules/wallet/marks'
import type { ChainId } from '@extension/shared'
import { useState } from 'react'

/** The token's logo, or its first two letters while there is none, with a chain badge. */
export const TokenLogo = ({
  logo,
  symbol,
  large,
  chain,
}: {
  logo: string | null | undefined
  symbol: string
  large?: boolean
  chain: ChainId
}) => {
  const [failed, setFailed] = useState(false)
  const className = `catalyst-tweet-market-avatar${large ? ' catalyst-tweet-market-avatar-large' : ''}`
  return (
    <span className="catalyst-tweet-market-avatar-wrap">
      {!logo || failed ? (
        <span className={className} aria-hidden="true">
          {symbol.slice(0, 2)}
        </span>
      ) : (
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          decoding="async"
          onError={() => setFailed(true)}
          className={className}
        />
      )}
      <span
        className="catalyst-tweet-market-chain-badge"
        role="img"
        aria-label={chain === 'solana' ? 'Solana' : 'BNB Chain'}>
        <NamespaceMark
          namespace={chain === 'solana' ? 'svm' : 'evm'}
          className="catalyst-chain-mark"
        />
      </span>
    </span>
  )
}

import { CHAINS } from '@extension/shared'
import type { ChainId } from '@extension/shared'
import { Selector } from '@x/layouts/global-layout/chain-switcher'
import { NamespaceMark } from '@x/modules/wallet/marks'
import { PATHS } from '@x/routers/paths'
import { matchPath, useLocation } from 'react-router-dom'

import { switchTradeChain } from './store'
import type { WebTradeIntent } from './store'

/**
 * BNB Chain or Solana, for a token its issuer lists on both — Ondo, today.
 *
 * The X panel's chain pill, offered only when the lexicon has the ticker on
 * more than one chain for this issuer, so it never leads to "not available".
 * A switch keeps the screen the user is on; the X switch goes back to its token
 * list, which the panel off X does not have.
 */
export const ChainSwitch = ({ intent }: { intent: WebTradeIntent }) => {
  const { pathname } = useLocation()
  if (intent.chains.length < 2) return null

  const screen = matchPath(PATHS.TOKEN, pathname) ? 'token' : 'buy'
  return (
    <Selector<ChainId>
      ariaLabel="Chain"
      value={intent.chain}
      label={CHAINS[intent.chain].label}
      align="left"
      options={intent.chains.map((chain) => ({
        value: chain,
        label: CHAINS[chain].label,
        icon: <NamespaceMark namespace={chain === 'solana' ? 'svm' : 'evm'} className="size-4" />,
      }))}
      onSelect={(chain) => switchTradeChain(chain, screen)}
    />
  )
}

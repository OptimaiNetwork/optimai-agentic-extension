import { dynamicPaths } from '@x/routers/paths'
import type { TokenNavigationState } from '@x/routers/paths'
import type { PortfolioChain, PortfolioVenue } from '@x/services/catalyst'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export interface HeldToken {
  chain: PortfolioChain
  venue: PortfolioVenue
  ticker: string
}

/**
 * Opens a token's page on the issuer and chain it was traded on.
 *
 * The portfolio mixes chains while the panel shows one listing at a time: MSFT
 * bought on Solana has to open Ondo on Solana, not whatever the header was on.
 * The ticker page applies `venue` and `chain` once, as a Home row's are, and
 * its back arrow returns here rather than to Market.
 */
export const useOpenToken = () => {
  const navigate = useNavigate()
  return useCallback(
    ({ chain, venue, ticker }: HeldToken) => {
      const state: TokenNavigationState = {
        venue,
        chain,
        returnPath: dynamicPaths.portfolio(),
      }
      navigate(dynamicPaths.token(ticker), { state })
    },
    [navigate]
  )
}
